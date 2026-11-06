import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Timestamp } from 'firebase-admin/firestore'
import { SUBSCRIPTIONS, milesBetween, sendPush, type StoredSubscription } from '@/lib/push'
import { db } from '@/lib/firebase-admin'

/**
 * Weekly "new places near you" digest, run by Vercel Cron (see vercel.json).
 *
 * Anyone subscribed gets at most one notification per week, and only when
 * places were actually added within 40 miles of the location they attached to
 * their subscription. If nothing is new, nothing is sent — the whole point of
 * a notification is that it is worth interrupting someone for.
 *
 * Protected by CRON_SECRET; Vercel sends it as a bearer token on scheduled
 * runs. Add ?dry=1 to see what would go out without sending.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RADIUS_MILES = 40
const LOOKBACK_DAYS = 14
const MAX_SUBSCRIPTIONS = 500
const MAX_NEW_PLACES = 2_000

type PlaceLite = { name: string; slug: string; city: string | null; state: string | null; lat: number; lng: number; createdAt: Date }

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

async function recentPlaces(since: Date): Promise<PlaceLite[]> {
  const snapshot = await db
    .collection('places')
    .where('createdAt', '>=', since)
    .orderBy('createdAt', 'desc')
    .limit(MAX_NEW_PLACES)
    .get()

  return snapshot.docs.flatMap((doc) => {
    const data = doc.data() as {
      name?: string
      slug?: string
      city?: string | null
      state?: string | null
      lat?: number
      lng?: number
      createdAt?: Timestamp
    }
    if (!data.name || !data.slug || typeof data.lat !== 'number' || typeof data.lng !== 'number' || !data.createdAt) {
      return []
    }
    return [{
      name: data.name,
      slug: data.slug,
      city: data.city ?? null,
      state: data.state ?? null,
      lat: data.lat,
      lng: data.lng,
      createdAt: data.createdAt.toDate(),
    }]
  })
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1'
  const now = new Date()
  const lookback = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000)

  const [subsSnap, places] = await Promise.all([
    SUBSCRIPTIONS.where('enabled', '==', true).limit(MAX_SUBSCRIPTIONS).get(),
    recentPlaces(lookback),
  ])

  if (places.length === 0) {
    return NextResponse.json({ ok: true, subscriptions: subsSnap.size, newPlaces: 0, sent: 0 })
  }

  let sent = 0
  let gone = 0
  let skipped = 0
  const preview: { city: string | null; count: number; first: string }[] = []

  for (const doc of subsSnap.docs) {
    const sub = doc.data() as StoredSubscription
    if (!sub.enabled || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue

    const since = sub.lastSentAt ? new Date(sub.lastSentAt) : new Date(sub.createdAt)
    if (typeof sub.lat !== 'number' || typeof sub.lng !== 'number') {
      skipped++
      continue
    }

    const nearby = places.filter(
      (place) => place.createdAt > since && milesBetween(sub.lat!, sub.lng!, place.lat, place.lng) <= RADIUS_MILES,
    )
    if (nearby.length === 0) {
      skipped++
      continue
    }

    const where = [nearby[0].city, nearby[0].state].filter(Boolean).join(', ') || sub.city || 'you'
    const names = nearby.slice(0, 3).map((place) => place.name).join(', ')
    const payload = {
      title: `${nearby.length} new ${nearby.length === 1 ? 'place' : 'places'} near ${where}`,
      body: nearby.length > 3 ? `${names} and ${nearby.length - 3} more` : names,
      url: '/near-me',
    }

    preview.push({ city: sub.city, count: nearby.length, first: nearby[0].name })
    if (dry) continue

    const outcome = await sendPush(sub, payload)
    if (outcome === 'gone') {
      gone++
      await doc.ref.set({ enabled: false, disabledAt: now.toISOString() }, { merge: true })
      continue
    }
    if (outcome === 'sent') {
      sent++
      await doc.ref.set({ lastSentAt: now.toISOString() }, { merge: true })
    }
  }

  return NextResponse.json({
    ok: true,
    subscriptions: subsSnap.size,
    newPlaces: places.length,
    sent,
    gone,
    skipped,
    dry,
    preview: preview.slice(0, 20),
  })
}
