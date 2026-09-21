import 'server-only'
import type { NextRequest } from 'next/server'
import { geolocation, ipAddress } from '@vercel/functions'
import { db } from './firebase-admin'

const COUNTER_REF = db.collection('analytics').doc('visitCounter')
export const VISITS_COLLECTION = db.collection('analytics_visits')
const NOTIFY_EVERY = 10

/**
 * Set from the /analytics dashboard (see actions.ts) to stop tracking the
 * person viewing the dashboard. Without this, browsing your own site inflates
 * every metric — sessions, bounce rate, "new visitors" — with traffic that
 * isn't a real visitor.
 */
export const IGNORE_COOKIE = 'ap_ignore'

/** Set by the proxy on every page view; also how /api/track knows a real browser sent an event. */
export const VISITOR_COOKIE = 'ap_vid'
export const SESSION_COOKIE = 'ap_sid'

export type DeviceType = 'Mobile' | 'Tablet' | 'Desktop'

/** One stored page view. Written by trackVisit, read by the /analytics dashboard. */
export interface VisitRecord {
  ts: Date
  path: string
  query: string | null
  searchQuery: string | null
  host: string | null
  referrer: string | null
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  visitorId: string | null
  sessionId: string | null
  newVisitor: boolean
  newSession: boolean
  device: DeviceType
  browser: string
  os: string
  bot: boolean
  language: string | null
  country: string | null
  countryRegion: string | null
  city: string | null
  flag: string | null
  postalCode: string | null
  latitude: string | null
  longitude: string | null
  edgeRegion: string | null
  ip: string | null
  userAgent: string | null
}

export interface VisitContext {
  visitorId: string
  sessionId: string
  newVisitor: boolean
  newSession: boolean
}

export function deviceType(userAgent: string): DeviceType {
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) return 'Tablet'
  if (/Mobi|iPhone|Android/i.test(userAgent)) return 'Mobile'
  return 'Desktop'
}

function browserName(ua: string): string {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/FxiOS|Firefox\//.test(ua)) return 'Firefox'
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Other'
}

function osName(ua: string): string {
  if (/Windows/.test(ua)) return 'Windows'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Other'
}

/**
 * Catches crawlers whose UA carries none of the generic tokens above —
 * verified against a day of real traffic (see the analytics chat thread):
 * GoogleOther and Google-InspectionTool are Google's own auxiliary crawlers,
 * DarkVisitor is an AI-training crawler, and Meta's fetcher identifies itself
 * as "meta-externalagent", not "...bot".
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|scrape|preview|fetch|curl|wget|python|axios|node-fetch|go-http|java\/|headless|lighthouse|pingdom|uptime|monitor|facebookexternalhit|embedly|whatsapp|vercel|googleother|google-inspectiontool|darkvisitor|externalagent/i

/**
 * Google's published Googlebot/GoogleOther range (see
 * https://developers.google.com/search/apis/ipranges/googlebot.json). Some
 * of Google's crawlers carry a UA with no bot-like token at all, so this
 * catches those on IP alone — real traffic never legitimately originates
 * from this block.
 */
function isGooglebotIp(ip: string | null): boolean {
  if (!ip) return false
  const match = /^66\.249\.(\d+)\./.exec(ip)
  if (!match) return false
  const secondOctet = Number(match[1])
  return secondOctet >= 64 && secondOctet <= 95
}

/**
 * Scrapers reuse one stale Chrome build for months. Chrome 100 shipped in
 * March 2022 and browsers auto-update, so a "person" on anything older is
 * almost always automation — a day of traffic had ~110 such hits, each with
 * its own fresh cookie, which inflated "unique visitors".
 */
const OLDEST_PLAUSIBLE_CHROME = 100

function isStaleChrome(ua: string): boolean {
  const major = /Chrome\/(\d+)\./.exec(ua)?.[1]
  return major !== undefined && Number(major) < OLDEST_PLAUSIBLE_CHROME
}

export function isBot(ua: string, ip: string | null): boolean {
  return !ua || BOT_PATTERN.test(ua) || isGooglebotIp(ip) || isStaleChrome(ua)
}

/**
 * Requests for files rather than pages: the search index the search box
 * downloads, ads.txt, the hero video, generated icons. They pass through the
 * proxy like everything else but are not page views, and counting them made
 * /search-index.json the "top page" and inflated every total.
 */
const ASSET_PATH = /\.(?:json|txt|xml|mp4|webm|jpe?g|png|gif|svg|webp|avif|ico|js|css|map|woff2?)$|^\/(?:icon|apple-icon|opengraph-image)$/i

export function isAssetPath(pathname: string): boolean {
  return ASSET_PATH.test(pathname)
}

function hostOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
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

function buildVisitRecord(request: NextRequest, context: VisitContext): VisitRecord {
  const userAgent = request.headers.get('user-agent') ?? ''
  const referrer = request.headers.get('referer')
  const referrerHost = hostOf(referrer)
  const ownHost = request.nextUrl.hostname.replace(/^www\./, '')
  const geo = geolocation(request)
  const params = request.nextUrl.searchParams
  const decode = (value: string | undefined) => (value ? decodeURIComponent(value) : null)
  const ip = ipAddress(request) ?? null

  return {
    ts: new Date(),
    path: request.nextUrl.pathname,
    query: request.nextUrl.search || null,
    searchQuery: request.nextUrl.pathname === '/search' ? params.get('q')?.trim() || null : null,
    host: request.nextUrl.hostname,
    referrer,
    // Internal navigation is not a traffic source.
    referrerHost: referrerHost && referrerHost !== ownHost ? referrerHost : null,
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    visitorId: context.visitorId,
    sessionId: context.sessionId,
    newVisitor: context.newVisitor,
    newSession: context.newSession,
    device: deviceType(userAgent),
    browser: browserName(userAgent),
    os: osName(userAgent),
    bot: isBot(userAgent, ip),
    language: request.headers.get('accept-language')?.split(',')[0]?.trim() || null,
    country: geo.country ?? null,
    countryRegion: geo.countryRegion ?? null,
    city: decode(geo.city),
    flag: geo.flag ?? null,
    postalCode: geo.postalCode ?? null,
    latitude: geo.latitude ?? null,
    longitude: geo.longitude ?? null,
    edgeRegion: geo.region ?? null,
    ip,
    userAgent: userAgent || null,
  }
}

/**
 * Stores the page view for the /analytics dashboard, increments the
 * site-wide visit counter and, every Nth visit, notifies Telegram. Runs from
 * Proxy on every real page view (see src/proxy.ts for the matcher that
 * filters out prefetches, assets, and API routes).
 */
export async function trackVisit(request: NextRequest, context: VisitContext): Promise<void> {
  const visit = buildVisitRecord(request, context)

  const [count] = await Promise.all([
    db.runTransaction(async (tx) => {
      const doc = await tx.get(COUNTER_REF)
      const next = (doc.data()?.count ?? 0) + 1
      tx.set(COUNTER_REF, { count: next, updatedAt: new Date().toISOString() })
      return next
    }),
    VISITS_COLLECTION.add(visit),
  ])

  if (count % NOTIFY_EVERY !== 0) return

  const location =
    [visit.city, visit.countryRegion, visit.country].filter(Boolean).join(', ') || 'Unknown'
  const page = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://allparx.com'}${visit.path}`

  const lines = [
    `<b>allparx.com</b> — visitor #${count}`,
    `Page: ${escapeHtml(page)}`,
    `Device: ${visit.device}`,
    `Location: ${escapeHtml(location)}${visit.flag ? ` ${visit.flag}` : ''}`,
    `Referrer: ${escapeHtml(visit.referrer ?? 'Direct / none')}`,
    `IP: ${escapeHtml(visit.ip ?? 'Unknown')}`,
    `User agent: ${escapeHtml(visit.userAgent ?? 'Unknown')}`,
  ]

  await sendTelegramMessage(lines.join('\n'))
}
