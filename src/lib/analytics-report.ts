import 'server-only'
import type { Timestamp } from 'firebase-admin/firestore'
import { VISITS_COLLECTION, isAssetPath, isBot, type VisitRecord } from './analytics'
import { loadAccountsReport, type AccountsReport } from './analytics-accounts'
import { loadClickReport, type ClickReport } from './analytics-clicks'
import { loadNearMeReport, type NearMeReport } from './analytics-near-me'
import { db } from './firebase-admin'

export const RANGES = { '1': 'Last 24 hours', '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days' } as const
export type RangeKey = keyof typeof RANGES

/**
 * Upper bound on person page views read per dashboard load, to keep Firestore
 * reads predictable. Bots are queried separately (see below) so they can no
 * longer use up this budget — they were ~80% of stored hits, which is why every
 * range used to show the same most-recent-10,000 rows.
 */
export const MAX_VISITS = 30_000

/** Bot hits pulled for the "Include bots" view. The bot total itself is an exact count, not this sample. */
const MAX_BOT_SAMPLE = 5_000
/** Bot hits pulled just to list their user agents. */
const BOT_AGENT_SAMPLE = 3_000

/** The fields the dashboard actually shows. Reading fewer fields makes 30,000 documents fast enough. */
const VISIT_FIELDS = [
  'ts', 'path', 'query', 'searchQuery', 'referrer', 'referrerHost', 'utmSource', 'utmMedium', 'utmCampaign',
  'visitorId', 'sessionId', 'newVisitor', 'newSession', 'device', 'browser', 'os', 'bot', 'language',
  'country', 'countryRegion', 'city', 'flag', 'edgeRegion', 'ip', 'userAgent',
] as const satisfies readonly (keyof VisitRecord)[]

export type Visit = Pick<VisitRecord, Exclude<(typeof VISIT_FIELDS)[number], 'ts'>> & { id: string; ts: Date }
export type Row = { label: string; count: number; share: number }
export type Bucket = { label: string; count: number; visitors: number }

/** Referrer hosts that mean "found us through a search engine". */
const SEARCH_ENGINE = /(^|\.)(google|bing|duckduckgo|yahoo|baidu|yandex|ecosia|brave|startpage|qwant)\./

export interface Report {
  /** Set when the range holds more than MAX_VISITS page views; the figures then cover only `coveredFrom` onward. */
  capped: boolean
  coveredFrom: Date | null
  /** Every tracked request since tracking began — bots included, so not a visitor count. */
  allTimeCount: number | null
  totals: {
    views: number
    visitors: number
    sessions: number
    newVisitors: number
    /** Visitors who viewed 2+ pages or pressed something: the closest thing to "a real person" we can measure. */
    engagedVisitors: number
    searchEngineVisitors: number
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
  clicks: ClickReport
  accounts: AccountsReport
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

/**
 * Newest-first visits of one kind. Filtering on `bot` in the query, rather than
 * after the read, is what lets the row limit apply to people only. Needs the
 * (bot, ts) composite index in firestore.indexes.json.
 */
async function fetchVisits(bot: boolean, since: Date, limit: number, fields: readonly string[]) {
  const snapshot = await VISITS_COLLECTION.where('bot', '==', bot)
    .where('ts', '>=', since)
    .orderBy('ts', 'desc')
    .limit(limit)
    .select(...fields)
    .get()

  const visits = snapshot.docs.map((doc) => {
    const data = doc.data() as Omit<Visit, 'id' | 'ts'> & { ts: Timestamp }
    return { ...data, id: doc.id, ts: data.ts.toDate() } as Visit
  })
  return { visits, full: snapshot.size >= limit }
}

/** gRPC FAILED_PRECONDITION means the query needs an index that hasn't been deployed. */
function explainMissingIndex(error: unknown): never {
  if ((error as { code?: number }).code === 9) {
    throw new Error(
      'Firestore index missing for analytics_visits (bot, ts). Run: npx firebase deploy --only firestore:indexes',
    )
  }
  throw error
}

async function countBots(since: Date): Promise<number> {
  // The explicit descending order is what lets the (bot, ts DESC) index serve
  // this count; without it Firestore wants a second, ascending index.
  const result = await VISITS_COLLECTION.where('bot', '==', true)
    .where('ts', '>=', since)
    .orderBy('ts', 'desc')
    .count()
    .get()
  return result.data().count
}

export async function loadReport(range: RangeKey, includeBots: boolean): Promise<Report> {
  const days = Number(range)
  const now = new Date()
  const since = new Date(now.getTime() - days * 86_400_000)

  const [people, botSample, botCount, counter] = await Promise.all([
    fetchVisits(false, since, MAX_VISITS, VISIT_FIELDS),
    fetchVisits(
      true,
      since,
      includeBots ? MAX_BOT_SAMPLE : BOT_AGENT_SAMPLE,
      includeBots ? VISIT_FIELDS : ['ts', 'path', 'userAgent'],
    ),
    countBots(since),
    db.collection('analytics').doc('visitCounter').get(),
  ]).catch(explainMissingIndex)

  // The stored `bot` flag reflects the rules in force when the hit arrived.
  // Re-applying today's rules, and dropping file requests recorded before the
  // proxy stopped counting them, corrects history without rewriting it.
  const reclassified: Visit[] = []
  const counted: Visit[] = []
  for (const v of people.visits) {
    if (isAssetPath(v.path)) continue
    if (isBot(v.userAgent ?? '', v.ip)) reclassified.push({ ...v, bot: true })
    else counted.push(v)
  }

  // Bot hits for the "Include bots" view only. Files are dropped for the same
  // reason as above; the exact bot total below still counts every bot request.
  const botVisits = includeBots ? botSample.visits.filter((v) => !isAssetPath(v.path)) : []
  const visits = includeBots ? [...counted, ...reclassified, ...botVisits].sort((a, b) => b.ts.getTime() - a.ts.getTime()) : counted
  const botAgentRows = [...botSample.visits, ...reclassified]
  const total = visits.length
  const visitorKey = (v: Visit) => v.visitorId ?? v.ip ?? v.id
  const capped = people.full
  const coveredFrom = capped ? (people.visits[people.visits.length - 1]?.ts ?? null) : null

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

  const [nearMe, clicks, accounts] = await Promise.all([
    loadNearMeReport(since, {
      sessions: sessions.size,
      nearMePageViews: visits.filter((v) => v.path === '/near-me').length,
    }),
    loadClickReport(since, visitorIds),
    loadAccountsReport(since, days),
  ])

  const engagedVisitors = [...byVisitor.entries()].filter(
    ([id, list]) => list.length > 1 || clicks.clickerIds.has(id),
  ).length
  const searchEngineVisitors = new Set(
    visits.filter((v) => v.referrerHost && SEARCH_ENGINE.test(v.referrerHost)).map(visitorKey),
  ).size

  return {
    capped,
    coveredFrom,
    allTimeCount: counter.data()?.count ?? null,
    totals: {
      views: total,
      visitors: visitorIds.size,
      sessions: sessions.size,
      newVisitors,
      engagedVisitors,
      searchEngineVisitors,
      pagesPerSession: sessions.size ? total / sessions.size : 0,
      bounceRate: sessions.size ? bounces / sessions.size : 0,
      avgSessionSeconds,
      lastHour: visits.filter((v) => now.getTime() - v.ts.getTime() < 3_600_000).length,
      // Exact count of stored bot hits (files included), plus person hits today's rules call bots.
      bots: botCount + reclassified.length,
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
    botAgents: rank(botAgentRows.map((v) => v.userAgent), botAgentRows.length),
    nearMe,
    clicks,
    accounts,
    topVisitors,
    recent: visits.slice(0, 200),
  }
}
