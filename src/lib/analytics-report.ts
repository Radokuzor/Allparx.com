import 'server-only'
import type { Timestamp } from 'firebase-admin/firestore'
import { VISITS_COLLECTION, type VisitRecord } from './analytics'
import { loadNearMeReport, type NearMeReport } from './analytics-near-me'
import { db } from './firebase-admin'

export const RANGES = { '1': 'Last 24 hours', '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days' } as const
export type RangeKey = keyof typeof RANGES

/** Upper bound on documents read per dashboard load, to keep Firestore reads predictable. */
export const MAX_VISITS = 10_000

export type Visit = Omit<VisitRecord, 'ts'> & { id: string; ts: Date }
export type Row = { label: string; count: number; share: number }
export type Bucket = { label: string; count: number; visitors: number }

export interface Report {
  capped: boolean
  allTimeCount: number | null
  totals: {
    views: number
    visitors: number
    sessions: number
    newVisitors: number
    pagesPerSession: number
    bounceRate: number
    avgSessionSeconds: number
    lastHour: number
    bots: number
  }
  series: Bucket[]
  hours: Bucket[]
  weekdays: Bucket[]
  pages: Row[]
  entryPages: Row[]
  exitPages: Row[]
  referrers: Row[]
  campaigns: Row[]
  searches: Row[]
  countries: Row[]
  regions: Row[]
  cities: Row[]
  devices: Row[]
  browsers: Row[]
  os: Row[]
  languages: Row[]
  edgeRegions: Row[]
  botAgents: Row[]
  nearMe: NearMeReport
  topVisitors: { id: string; views: number; sessions: number; lastSeen: Date; location: string; ip: string | null; device: string }[]
  recent: Visit[]
}

function rank(values: (string | null | undefined)[], total = values.length, limit = 15): Row[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    const key = value || '(none)'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count, share: total ? count / total : 0 }))
}

function bucketize(visits: Visit[], labels: string[], keyOf: (v: Visit) => string): Bucket[] {
  const views = new Map(labels.map((l) => [l, 0]))
  const people = new Map(labels.map((l) => [l, new Set<string>()]))
  for (const v of visits) {
    const key = keyOf(v)
    if (!views.has(key)) continue
    views.set(key, views.get(key)! + 1)
    people.get(key)!.add(v.visitorId ?? v.ip ?? v.id)
  }
  return labels.map((label) => ({ label, count: views.get(label)!, visitors: people.get(label)!.size }))
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function loadReport(range: RangeKey, includeBots: boolean): Promise<Report> {
  const days = Number(range)
  const now = new Date()
  const since = new Date(now.getTime() - days * 86_400_000)

  const [snapshot, counter] = await Promise.all([
    VISITS_COLLECTION.where('ts', '>=', since).orderBy('ts', 'desc').limit(MAX_VISITS).get(),
    db.collection('analytics').doc('visitCounter').get(),
  ])

  const all: Visit[] = snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<VisitRecord, 'ts'> & { ts: Timestamp }
    return { ...data, id: doc.id, ts: data.ts.toDate() }
  })
  const bots = all.filter((v) => v.bot)
  const visits = includeBots ? all : all.filter((v) => !v.bot)
  const total = visits.length
  const visitorKey = (v: Visit) => v.visitorId ?? v.ip ?? v.id

  // Sessions: visits arrive newest-first, so the last one seen is the entry page.
  const sessions = new Map<string, Visit[]>()
  for (const v of visits) {
    const key = v.sessionId ?? v.id
    const list = sessions.get(key)
    if (list) list.push(v)
    else sessions.set(key, [v])
  }
  const sessionList = [...sessions.values()]
  const bounces = sessionList.filter((s) => s.length === 1).length
  const multiPage = sessionList.filter((s) => s.length > 1)
  const avgSessionSeconds = multiPage.length
    ? multiPage.reduce((sum, s) => sum + (s[0].ts.getTime() - s[s.length - 1].ts.getTime()), 0) /
      multiPage.length /
      1000
    : 0

  const visitorIds = new Set(visits.map(visitorKey))
  const newVisitors = new Set(visits.filter((v) => v.newVisitor).map(visitorKey)).size

  // Time series: hourly for 24h, daily otherwise (UTC).
  let series: Bucket[]
  if (days === 1) {
    const labels = Array.from({ length: 24 }, (_, i) =>
      new Date(now.getTime() - (23 - i) * 3_600_000).toISOString().slice(0, 13),
    )
    series = bucketize(visits, labels, (v) => v.ts.toISOString().slice(0, 13)).map((b) => ({
      ...b,
      label: `${b.label.slice(11, 13)}:00`,
    }))
  } else {
    const labels = Array.from({ length: days }, (_, i) =>
      new Date(now.getTime() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
    )
    series = bucketize(visits, labels, (v) => v.ts.toISOString().slice(0, 10))
  }

  const hours = bucketize(
    visits,
    Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
    (v) => String(v.ts.getUTCHours()).padStart(2, '0'),
  )
  const weekdays = bucketize(visits, WEEKDAYS, (v) => WEEKDAYS[v.ts.getUTCDay()])

  const byVisitor = new Map<string, Visit[]>()
  for (const v of visits) {
    const key = visitorKey(v)
    const list = byVisitor.get(key)
    if (list) list.push(v)
    else byVisitor.set(key, [v])
  }
  const topVisitors = [...byVisitor.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 15)
    .map(([id, list]) => ({
      id,
      views: list.length,
      sessions: new Set(list.map((v) => v.sessionId)).size,
      lastSeen: list[0].ts,
      location: [list[0].city, list[0].countryRegion, list[0].country].filter(Boolean).join(', ') || '—',
      ip: list[0].ip,
      device: `${list[0].device} · ${list[0].browser} · ${list[0].os}`,
    }))

  const campaigns = visits
    .filter((v) => v.utmSource || v.utmCampaign)
    .map((v) => [v.utmSource, v.utmMedium, v.utmCampaign].filter(Boolean).join(' / '))

  const nearMe = await loadNearMeReport(since, {
    sessions: sessions.size,
    nearMePageViews: visits.filter((v) => v.path === '/near-me').length,
  })

  return {
    capped: snapshot.size >= MAX_VISITS,
    allTimeCount: counter.data()?.count ?? null,
    totals: {
      views: total,
      visitors: visitorIds.size,
      sessions: sessions.size,
      newVisitors,
      pagesPerSession: sessions.size ? total / sessions.size : 0,
      bounceRate: sessions.size ? bounces / sessions.size : 0,
      avgSessionSeconds,
      lastHour: visits.filter((v) => now.getTime() - v.ts.getTime() < 3_600_000).length,
      bots: bots.length,
    },
    series,
    hours,
    weekdays,
    pages: rank(visits.map((v) => v.path), total, 25),
    entryPages: rank(sessionList.map((s) => s[s.length - 1].path), sessionList.length),
    exitPages: rank(sessionList.map((s) => s[0].path), sessionList.length),
    referrers: rank(visits.filter((v) => v.newSession).map((v) => v.referrerHost ?? 'Direct / none'), sessionList.length),
    campaigns: rank(campaigns, campaigns.length),
    searches: rank(visits.filter((v) => v.searchQuery).map((v) => v.searchQuery!.toLowerCase()), undefined, 25),
    countries: rank(visits.map((v) => (v.country ? `${v.flag ?? ''} ${v.country}`.trim() : null)), total),
    regions: rank(visits.map((v) => (v.countryRegion ? `${v.countryRegion}, ${v.country}` : null)), total),
    cities: rank(visits.map((v) => (v.city ? `${v.city}, ${v.countryRegion ?? ''} ${v.country ?? ''}`.trim() : null)), total, 25),
    devices: rank(visits.map((v) => v.device), total),
    browsers: rank(visits.map((v) => v.browser), total),
    os: rank(visits.map((v) => v.os), total),
    languages: rank(visits.map((v) => v.language), total),
    edgeRegions: rank(visits.map((v) => v.edgeRegion), total),
    botAgents: rank(bots.map((v) => v.userAgent), bots.length),
    nearMe,
    topVisitors,
    recent: visits.slice(0, 200),
  }
}
