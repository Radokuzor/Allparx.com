import 'server-only'
import type { NextRequest } from 'next/server'
import { geolocation, ipAddress } from '@vercel/functions'
import { db } from './firebase-admin'

const COUNTER_REF = db.collection('analytics').doc('visitCounter')
const NOTIFY_EVERY = 10

function deviceType(userAgent: string): 'Mobile' | 'Tablet' | 'Desktop' {
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) return 'Tablet'
  if (/Mobi|iPhone|Android/i.test(userAgent)) return 'Mobile'
  return 'Desktop'
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[analytics] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing — skipping notification')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
    if (!response.ok) {
      console.warn('[analytics] Telegram API error', response.status, await response.text())
    }
  } catch (error) {
    console.warn('[analytics] failed to reach Telegram', error)
  }
}

/**
 * Increments the site-wide visit counter and, every Nth visit, notifies
 * Telegram with the visitor's page, device, and location. Runs from Proxy
 * on every real page view (see src/proxy.ts for the matcher that filters
 * out prefetches, assets, and API routes).
 */
export async function trackVisit(request: NextRequest): Promise<void> {
  const count = await db.runTransaction(async (tx) => {
    const doc = await tx.get(COUNTER_REF)
    const next = (doc.data()?.count ?? 0) + 1
    tx.set(COUNTER_REF, { count: next, updatedAt: new Date().toISOString() })
    return next
  })

  if (count % NOTIFY_EVERY !== 0) return

  const userAgent = request.headers.get('user-agent') ?? ''
  const referer = request.headers.get('referer')
  const geo = geolocation(request)
  const location =
    [geo.city, geo.countryRegion, geo.country].filter(Boolean).join(', ') || 'Unknown'
  const ip = ipAddress(request)
  const page = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://allparx.com'}${request.nextUrl.pathname}`

  const lines = [
    `<b>allparx.com</b> — visitor #${count}`,
    `Page: ${escapeHtml(page)}`,
    `Device: ${deviceType(userAgent)}`,
    `Location: ${escapeHtml(location)}${geo.flag ? ` ${geo.flag}` : ''}`,
    `Referrer: ${escapeHtml(referer ?? 'Direct / none')}`,
    `IP: ${escapeHtml(ip ?? 'Unknown')}`,
    `User agent: ${escapeHtml(userAgent || 'Unknown')}`,
  ]

  await sendTelegramMessage(lines.join('\n'))
}
