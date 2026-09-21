import 'server-only'
import { db } from './firebase-admin'
import { nearestPlaceLabel } from './geo-lookup'
import { isKnownType } from './place-types'
import {
  CLICK_KINDS,
  CLICK_REGIONS,
  NEAR_ME_SOURCES,
  type ClickKind,
  type ClickRegion,
  type Supply,
} from './track-event'

export const EVENTS_COLLECTION = db.collection('analytics_events')
/** Kept apart from near-me events: clicks are far more frequent and would crowd them out of the report's read cap. */
export const CLICKS_COLLECTION = db.collection('analytics_clicks')

/** Fields every stored event carries, taken from the request rather than the client. */
export interface EventContext {
  visitorId: string
  sessionId: string
  device: string
  country: string | null
  countryRegion: string | null
}

export type NearMeClickEvent = {
  type: 'near_me_click'
  source: (typeof NEAR_ME_SOURCES)[number]
  path: string
}

export type NearMeSearchEvent = {
  type: 'near_me_search'
  method: 'gps' | 'lookup'
  outcome: 'ok' | 'not_found' | 'gps_failed'
  query: string | null
  /** The area the search resolved to, for grouping: "Austin, TX". */
  area: string | null
  lat: number | null
  lng: number | null
  supply: Supply | null
  reason: string | null
}

export type ClickEvent = {
  type: 'click'
  kind: ClickKind
  label: string
  region: ClickRegion
  path: string
}

export type StoredEvent = (NearMeClickEvent | NearMeSearchEvent) & EventContext & { ts: Date }
export type StoredClick = ClickEvent & EventContext & { ts: Date }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100_000
    ? value
    : null
}

function coordinate(value: unknown, limit: number, places: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) return null
  const scale = 10 ** places
  return Math.round(value * scale) / scale
}

function parseSupply(value: unknown): Supply | null {
  if (!isRecord(value)) return null
  const within10 = count(value.within10)
  const within25 = count(value.within25)
  const within50 = count(value.within50)
  if (within10 === null || within25 === null || within50 === null) return null

  const nearest =
    typeof value.nearest === 'number' && Number.isFinite(value.nearest) && value.nearest >= 0
      ? Math.round(Math.min(value.nearest, 20_000) * 10) / 10
      : null

  const byType: Record<string, number> = {}
  if (isRecord(value.byType)) {
    for (const [type, n] of Object.entries(value.byType)) {
      const parsed = count(n)
      if (isKnownType(type) && parsed !== null) byType[type] = parsed
    }
  }
  return { nearest, within10, within25, within50, byType }
}

/**
 * Turns an untrusted request body into an event we are willing to store, or
 * null. This endpoint is a public write path into Firestore, so nothing is
 * kept that isn't on an allow-list, and every string is length-capped.
 */
export function parseEvent(body: unknown): ClickEvent | NearMeClickEvent | NearMeSearchEvent | null {
  if (!isRecord(body)) return null

  if (body.type === 'click') {
    const label = text(body.label, 60)
    const path = text(body.path, 200)
    const kind = CLICK_KINDS.find((k) => k === body.kind)
    const region = CLICK_REGIONS.find((r) => r === body.region)
    return label && path?.startsWith('/') && kind && region ? { type: 'click', kind, label, region, path } : null
  }

  if (body.type === 'near_me_click') {
    const path = text(body.path, 200)
    const source = NEAR_ME_SOURCES.find((s) => s === body.source)
    return path?.startsWith('/') && source ? { type: 'near_me_click', source, path } : null
  }

  if (body.type !== 'near_me_search') return null
  const method = body.method === 'gps' || body.method === 'lookup' ? body.method : null
  if (!method) return null

  const blank = { type: 'near_me_search', method, query: null, area: null, lat: null, lng: null, supply: null, reason: null } as const

  if (body.outcome === 'not_found' && method === 'lookup') {
    const query = text(body.query, 100)
    return query ? { ...blank, outcome: 'not_found', query } : null
  }

  if (body.outcome === 'gps_failed' && method === 'gps') {
    const reason = ['denied', 'timeout', 'unavailable', 'unsupported'].find((r) => r === body.reason)
    return reason ? { ...blank, outcome: 'gps_failed', reason } : null
  }

  if (body.outcome !== 'ok') return null

  // A GPS fix is kept to ~7 miles no matter what the client sent; a looked-up
  // place is a town centroid to begin with, so two decimals loses nothing.
  const places = method === 'gps' ? 1 : 2
  const lat = coordinate(body.lat, 90, places)
  const lng = coordinate(body.lng, 180, places)
  const supply = parseSupply(body.supply)
  if (lat === null || lng === null || !supply) return null

  const label = text(body.label, 100)
  // A typed city is already the area. A ZIP or a GPS fix isn't, so name the
  // nearest town — otherwise every ZIP would be its own row in the report.
  const area =
    method === 'lookup' && label && !label.startsWith('ZIP ')
      ? label
      : nearestPlaceLabel(lat, lng)

  return {
    ...blank,
    outcome: 'ok',
    query: method === 'lookup' ? text(body.query, 100) : null,
    area,
    lat,
    lng,
    supply,
  }
}

export async function saveEvent(
  event: ClickEvent | NearMeClickEvent | NearMeSearchEvent,
  context: EventContext,
) {
  const ts = new Date()
  if (event.type === 'click') {
    await CLICKS_COLLECTION.add({ ...event, ...context, ts } satisfies StoredClick)
  } else {
    await EVENTS_COLLECTION.add({ ...event, ...context, ts } satisfies StoredEvent)
  }
}
