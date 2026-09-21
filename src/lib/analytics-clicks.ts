import 'server-only'
import type { Timestamp } from 'firebase-admin/firestore'
import { CLICKS_COLLECTION, type StoredClick } from './analytics-events'
import type { Row } from './analytics-report'

/** Upper bound on click documents read per dashboard load. */
export const MAX_CLICKS = 20_000

export type ClickRow = {
  label: string
  region: string
  clicks: number
  /** Distinct visitors who pressed it — the number that answers "how many people". */
  people: number
  /** People who pressed it, as a share of all visitors in the range. */
  reach: number
  /** Where it is pressed most. */
  topPage: string
}

export type ClickReport = {
  capped: boolean
  totals: {
    clicks: number
    clickers: number
    /** Share of visitors who pressed anything at all. */
    clickerRate: number
    clicksPerClicker: number
  }
  buttons: ClickRow[]
  links: ClickRow[]
  /** Pages ranked by how much people do on them. */
  pages: (Row & { people: number })[]
  recent: { id: string; ts: Date; kind: string; label: string; region: string; path: string; device: string; country: string | null }[]
  /** Visitors who did something on the page, for the "engaged" total. */
  clickerIds: Set<string>
}

const top = <T>(counts: Map<T, number>): T | undefined =>
  [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

function tally(clicks: (StoredClick & { id: string })[], limit: number, visitors: number): ClickRow[] {
  const groups = new Map<string, { label: string; region: string; clicks: number; people: Set<string>; pages: Map<string, number> }>()
  for (const click of clicks) {
    const key = `${click.region}\u0000${click.label}`
    let group = groups.get(key)
    if (!group) {
      group = { label: click.label, region: click.region, clicks: 0, people: new Set(), pages: new Map() }
      groups.set(key, group)
    }
    group.clicks += 1
    group.people.add(click.visitorId)
    group.pages.set(click.path, (group.pages.get(click.path) ?? 0) + 1)
  }
  return [...groups.values()]
    .sort((a, b) => b.people.size - a.people.size || b.clicks - a.clicks)
    .slice(0, limit)
    .map((group) => ({
      label: group.label,
      region: group.region,
      clicks: group.clicks,
      people: group.people.size,
      reach: visitors ? group.people.size / visitors : 0,
      topPage: top(group.pages) ?? '—',
    }))
}

/**
 * `visitorIds` are the dashboard's own unique visitors for the same range
 * (bots already excluded). Only their clicks count, so reach is measured
 * against the same population as every other number on the page.
 */
export async function loadClickReport(since: Date, visitorIds: Set<string>): Promise<ClickReport> {
  const visitors = visitorIds.size
  const snapshot = await CLICKS_COLLECTION.where('ts', '>=', since).orderBy('ts', 'desc').limit(MAX_CLICKS).get()

  const clicks = snapshot.docs
    .map((doc) => {
      const data = doc.data() as Omit<StoredClick, 'ts'> & { ts: Timestamp }
      return { ...data, id: doc.id, ts: data.ts.toDate() } as StoredClick & { id: string }
    })
    .filter((click) => visitorIds.has(click.visitorId))

  const clickers = new Set(clicks.map((c) => c.visitorId))

  const byPage = new Map<string, { clicks: number; people: Set<string> }>()
  for (const click of clicks) {
    const entry = byPage.get(click.path) ?? { clicks: 0, people: new Set<string>() }
    entry.clicks += 1
    entry.people.add(click.visitorId)
    byPage.set(click.path, entry)
  }

  return {
    capped: snapshot.size >= MAX_CLICKS,
    totals: {
      clicks: clicks.length,
      clickers: clickers.size,
      clickerRate: visitors ? Math.min(1, clickers.size / visitors) : 0,
      clicksPerClicker: clickers.size ? clicks.length / clickers.size : 0,
    },
    buttons: tally(clicks.filter((c) => c.kind === 'button'), 40, visitors),
    links: tally(clicks.filter((c) => c.kind === 'link'), 40, visitors),
    pages: [...byPage.entries()]
      .sort((a, b) => b[1].people.size - a[1].people.size || b[1].clicks - a[1].clicks)
      .slice(0, 20)
      .map(([label, entry]) => ({
        label,
        count: entry.clicks,
        people: entry.people.size,
        share: clicks.length ? entry.clicks / clicks.length : 0,
      })),
    recent: clicks.slice(0, 100).map((c) => ({
      id: c.id,
      ts: c.ts,
      kind: c.kind,
      label: c.label,
      region: c.region,
      path: c.path,
      device: c.device,
      country: c.country,
    })),
    clickerIds: clickers,
  }
}
