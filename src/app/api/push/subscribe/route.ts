import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ipAddress } from '@vercel/functions'
import { SUBSCRIPTIONS, subscriptionId } from '@/lib/push'
import { isBot } from '@/lib/analytics'

/**
 * Stores a browser push subscription, together with the coarsened location the
 * visitor chose to attach to it. Called from components/NearMeAlerts after the
 * browser has granted Notification permission and produced a subscription.
 *
 * Deliberately minimal: no IP, no user agent, no cookie, no email. If we cannot
 * tell the visitor when new places appear near them, the subscription is not
 * worth keeping.
 */
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4_000

const coarsen = (value: unknown, limit: number): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) return null
  return Math.round(value * 10) / 10
}

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

export async function POST(request: NextRequest) {
  const raw = await request.text().catch(() => '')
  if (!raw || raw.length > MAX_BODY_BYTES) return NextResponse.json({ ok: false }, { status: 400 })

  let body: {
    subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
    city?: unknown
    region?: unknown
    country?: unknown
    lat?: unknown
    lng?: unknown
  }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const endpoint = text(body.subscription?.endpoint, 1_000)
  const p256dh = text(body.subscription?.keys?.p256dh, 200)
  const auth = text(body.subscription?.keys?.auth, 100)
  if (!endpoint || !endpoint.startsWith('https://') || !p256dh || !auth) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // The UA is not stored; it is only used to keep automated clients out of the
  // subscriber list.
  if (isBot(request.headers.get('user-agent') ?? '', ipAddress(request) ?? null)) {
    return NextResponse.json({ ok: true, stored: false })
  }

  const id = subscriptionId(endpoint)
  await SUBSCRIPTIONS.doc(id).set(
    {
      endpoint,
      keys: { p256dh, auth },
      city: text(body.city, 80),
      region: text(body.region, 40),
      country: text(body.country, 4),
      lat: coarsen(body.lat, 90),
      lng: coarsen(body.lng, 180),
      createdAt: new Date().toISOString(),
      lastSentAt: null,
      enabled: true,
    },
    { merge: true },
  )

  return NextResponse.json({ ok: true, stored: true })
}
