import 'server-only'
import type { Timestamp } from 'firebase-admin/firestore'
import { EVENTS_COLLECTION, type StoredEvent } from './analytics-events'
import type { Row } from './analytics-report'

/** Upper bound on event documents read per dashboard load. */
export const MAX_EVENTS = 5_000

/** Fewer places than this within 25 miles reads as thin coverage. */
const THIN_BELOW = 5

export type Coverage = 'None' | 'Thin' | 'Covered'

export type AreaRow = {
  area: string
  searches: number
  visitors: number
  /** Mean places within 25 miles across this area's searches. */
  avgWithin25: number
  /** Mean miles to the closest place. Null when no search here found anything. */
  avgNearest: number | null
  coverage: Coverage
}

export type SearchRow = {
  id: string
  ts: Date
  method: 'gps' | 'lookup'
  outcome: 'ok' | 'not_found' | 'gps_failed'
  what: string
  within10: number | null
  within25: number | null
  within50: number | null
  nearest: number | null
  device: string
  country: string | null
}

export interface NearMeReport {
  capped: boolean
  clicks: {
    total: number
    floating: number
    hero: number
    /** Share of sessions in which the button was pressed. */
    sessionRate: number
  }
  /** Where visitors were when they pressed the floating button. */
  clickPages: Row[]
  /** Page views of /near-me itself — the step between a click and a search. */
  pageViews: number
  searches: {
    total: number
    gps: number
    lookup: number
    found: number
    notFound: number
    gpsFailed: number
    /** Successful searches with nothing within 25 miles: demand we can't serve. */
    unserved: number
  }
  areas: AreaRow[]
  /** Typed places the lookup table couldn't resolve. */
  missed: Row[]
  recent: SearchRow[]
}

function coverage(avgWithin25: number): Coverage {
  if (avgWithin25 === 0) return 'None'
  return avgWithin25 < THIN_BELOW ? 'Thin' : 'Covered'
}

function rank(values: string[], limit = 15): Row[] {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count, share: values.length ? count / values.length : 0 }))
}

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0

export async function loadNearMeReport(
  since: Date,
  totals: { sessions: number; nearMePageViews: number },
): Promise<NearMeReport> {
  const snapshot = await EVENTS_COLLECTION.where('ts', '>=', since)
    .orderBy('ts', 'desc')
    .limit(MAX_EVENTS)
    .get()

  const events = snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<StoredEvent, 'ts'> & { ts: Timestamp }
    return { ...data, id: doc.id, ts: data.ts.toDate() } as StoredEvent & { id: string }
  })

  const clicks = events.filter((e) => e.type === 'near_me_click')
  const searches = events.filter((e) => e.type === 'near_me_search')
  const found = searches.filter((e) => e.outcome === 'ok')

  const byArea = new Map<string, typeof found>()
  for (const search of found) {
    const key = search.area ?? '(outside US coverage)'
    const list = byArea.get(key)
    if (list) list.push(search)
    else byArea.set(key, [search])
  }

  const areas: AreaRow[] = [...byArea.entries()]
    .map(([area, list]) => {
      const supplies = list.map((s) => s.supply!)
      const nearest = supplies.flatMap((s) => (s.nearest === null ? [] : [s.nearest]))
      const avgWithin25 = mean(supplies.map((s) => s.within25))
      return {
        area,
        searches: list.length,
        visitors: new Set(list.map((s) => s.visitorId)).size,
        avgWithin25,
        avgNearest: nearest.length ? mean(nearest) : null,
        coverage: coverage(avgWithin25),
      }
    })
    // Most-wanted first; among equals, the least-served area first.
    .sort((a, b) => b.searches - a.searches || a.avgWithin25 - b.avgWithin25)
    .slice(0, 30)

  return {
    capped: snapshot.size >= MAX_EVENTS,
    clicks: {
      total: clicks.length,
      floating: clicks.filter((e) => e.type === 'near_me_click' && e.source === 'floating').length,
      hero: clicks.filter((e) => e.type === 'near_me_click' && e.source === 'hero').length,
      sessionRate: totals.sessions
        ? new Set(clicks.map((e) => e.sessionId)).size / totals.sessions
        : 0,
    },
    clickPages: rank(
      clicks.flatMap((e) =>
        e.type === 'near_me_click' && e.source === 'floating' ? [e.path] : [],
      ),
      20,
    ),
    pageViews: totals.nearMePageViews,
    searches: {
      total: searches.length,
      gps: searches.filter((e) => e.method === 'gps').length,
      lookup: searches.filter((e) => e.method === 'lookup').length,
      found: found.length,
      notFound: searches.filter((e) => e.outcome === 'not_found').length,
      gpsFailed: searches.filter((e) => e.outcome === 'gps_failed').length,
      unserved: found.filter((e) => e.supply?.within25 === 0).length,
    },
    areas,
    missed: rank(
      searches.flatMap((e) =>
        e.type === 'near_me_search' && e.outcome === 'not_found' && e.query
          ? [e.query.toLowerCase()]
          : [],
      ),
      20,
    ),
    recent: searches.slice(0, 100).map((e) => ({
      id: e.id,
      ts: e.ts,
      method: e.method,
      outcome: e.outcome,
      what:
        e.outcome === 'not_found'
          ? (e.query ?? '')
          : e.outcome === 'gps_failed'
            ? `GPS ${e.reason ?? 'failed'}`
            : e.method === 'gps'
              ? (e.area ?? 'Outside US coverage')
              : [e.query, e.area && e.area !== e.query ? `→ ${e.area}` : null].filter(Boolean).join(' '),
      within10: e.supply?.within10 ?? null,
      within25: e.supply?.within25 ?? null,
      within50: e.supply?.within50 ?? null,
      nearest: e.supply?.nearest ?? null,
      device: e.device,
      country: e.country,
    })),
  }
}
