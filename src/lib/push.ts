import 'server-only'
import { createHash } from 'node:crypto'
import webpush from 'web-push'
import { db } from './firebase-admin'

/**
 * Web push: the only visitor contact this site keeps that is not an email
 * address. A subscription is an opaque endpoint plus two keys, tied to a
 * coarse location (one decimal of lat/lng, about 7 miles) and nothing else.
 * No IP, no cookie, no identity. People ask for it explicitly, and it is used
 * to tell them when new places appear near them.
 */
export const SUBSCRIPTIONS = db.collection('push_subscriptions')

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

let configured = false
function ensureVapid(): void {
  if (!pushConfigured()) throw new Error('Web push is not configured: VAPID keys are missing')
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@allparx.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  configured = true
}

export type SubscriptionKeys = { p256dh: string; auth: string }

/** One document per device: the endpoint is unique but far too long to be a doc id. */
export function subscriptionId(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 40)
}

export type StoredSubscription = {
  endpoint: string
  keys: SubscriptionKeys
  /** "Austin, TX" as the visitor saw it, for the confirmation message only. */
  city: string | null
  region: string | null
  country: string | null
  /** Coarsened to one decimal: ~7 miles, enough to pick nearby places. */
  lat: number | null
  lng: number | null
  createdAt: string
  lastSentAt: string | null
  enabled: boolean
}

export type PushPayload = {
  title: string
  body: string
  url: string
}

/**
 * Sends one notification. A 404/410 means the browser dropped the
 * subscription (uninstalled, permission revoked), so the record is disabled
 * rather than retried forever.
 */
export async function sendPush(subscription: StoredSubscription, payload: PushPayload): Promise<'sent' | 'gone' | 'failed'> {
  ensureVapid()
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 * 7 },
    )
    return 'sent'
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return 'gone'
    console.warn('[push] send failed', status, (error as Error).message)
    return 'failed'
  }
}

/** Miles between two points, for "near me" matching. */
export function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const earthMiles = 3958.8
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * earthMiles * Math.asin(Math.min(1, Math.sqrt(h)))
}
