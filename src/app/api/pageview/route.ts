import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Timestamp } from 'firebase-admin/firestore'
import {
  DEFAULT_NOTIFY_EVERY,
  HIT_COOKIE,
  IGNORE_COOKIE,
  PEOPLE_COUNTER_REF,
  VISITS_COLLECTION,
  VISITOR_COOKIE,
  isBot,
  notifyPersonVisit,
  parseNotifyEvery,
  type VisitRecord,
} from '@/lib/analytics'
import { db } from '@/lib/firebase-admin'
import { judgeSignals, parseSignals } from '@/lib/human-signals'

/**
 * Receives the browser beacon for a page view (see components/PageViewBeacon).
 *
 * This is where a request becomes a visitor. The proxy has already stored the
 * hit; here the browser proves it rendered the page, and only then does the
 * visit count, advance the people counter, or trigger a Telegram ping.
 *
 * Silent by design: every rejection is a 204, so the endpoint tells a prober
 * nothing and the page never sees an error.
 */
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 2_000
const MAX_HIT_AGE_MS = 10 * 60_000
const NO_CONTENT = () => new NextResponse(null, { status: 204 })

export async function POST(request: NextRequest) {
  const hitId = request.cookies.get(HIT_COOKIE)?.value
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value
  if (!hitId || !visitorId) return NO_CONTENT()
  if (request.cookies.get(IGNORE_COOKIE)?.value === '1') return NO_CONTENT()

  const userAgent = request.headers.get('user-agent') ?? ''
  if (isBot(userAgent, null)) return NO_CONTENT()

  const raw = await request.text().catch(() => '')
  if (!raw || raw.length > MAX_BODY_BYTES) return NO_CONTENT()

  let body: { hitId?: unknown; signals?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return NO_CONTENT()
  }
  if (body.hitId !== hitId) return NO_CONTENT()

  const signals = parseSignals(body.signals)
  if (!signals) return NO_CONTENT()
  const verdict = judgeSignals(signals)

  try {
    const result = await db.runTransaction(async (tx) => {
      const ref = VISITS_COLLECTION.doc(hitId)
      const [hitSnap, counterSnap, settingsSnap] = await Promise.all([
        tx.get(ref),
        tx.get(PEOPLE_COUNTER_REF),
        tx.get(db.collection('analytics').doc('settings')),
      ])

      const hit = hitSnap.data() as (VisitRecord & { ts: Timestamp }) | undefined
      // Gone, already judged, or belonging to a different browser: nothing to do.
      if (!hitSnap.exists || !hit) return null
      if (hit.visitorId !== visitorId) return null
      if (hit.bot) return null
      if (hit.human !== null && hit.human !== undefined) return null
      if (hit.ts?.toDate && Date.now() - hit.ts.toDate().getTime() > MAX_HIT_AGE_MS) return null

      tx.update(ref, { human: verdict.human, humanReason: verdict.reason, client: signals })
      if (!verdict.human) return { counted: false as const }

      const next = (counterSnap.data()?.count ?? 0) + 1
      tx.set(PEOPLE_COUNTER_REF, { count: next, updatedAt: new Date().toISOString() })
      const every = parseNotifyEvery(settingsSnap.data()?.notifyEvery) ?? DEFAULT_NOTIFY_EVERY
      return { counted: true as const, count: next, every, hit }
    })

    if (result?.counted && result.every > 0 && result.count % result.every === 0) {
      await notifyPersonVisit(result.hit, result.count)
    }
  } catch (error) {
    console.warn('[analytics] could not verify page view', error)
  }

  return NO_CONTENT()
}
