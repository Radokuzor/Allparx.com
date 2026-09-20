/**
 * Filtering and ranking for /near-me. Pure functions over the static
 * `near-index.json`, so it all runs in the browser: a visitor's location never
 * has to reach a server just to sort a list.
 */
import { distanceMiles } from './legacy-slug'
import { NEAR_FLAGS, type NearEntry } from './near-index-format'
import { NEAR_INDEX_FILE } from './snapshot-path'
import type { Supply } from './track-event'

export type Origin = { lat: number; lng: number; label: string }
export type Ranked = { entry: NearEntry; miles: number }
export type SortKey = 'top' | 'nearest' | 'reviews'

/** 0 means "any distance". */
export const RADIUS_OPTIONS = [10, 25, 50, 100, 0] as const

export const SORT_LABELS: Record<SortKey, string> = {
  top: 'Top rated',
  nearest: 'Nearest',
  reviews: 'Most reviewed',
}

export type Filters = {
  types: ReadonlySet<string>
  /** OR of NEAR_FLAGS bits; a place must have every one set. */
  amenities: number
  radius: number
}

let pending: Promise<NearEntry[]> | null = null

/** One fetch per page session; a failure clears the cache so a retry can succeed. */
export function loadNearIndex(): Promise<NearEntry[]> {
  pending ??= fetch(`/${NEAR_INDEX_FILE}`)
    .then((response) => {
      if (!response.ok) throw new Error(`near index: ${response.status}`)
      return response.json() as Promise<NearEntry[]>
    })
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}

export function withDistance(entries: NearEntry[], origin: Origin): Ranked[] {
  return entries.map((entry) => ({
    entry,
    miles: distanceMiles(origin, { lat: entry.y, lng: entry.x }),
  }))
}

const inRadius = (item: Ranked, radius: number) => radius === 0 || item.miles <= radius
const hasAmenities = (item: Ranked, mask: number) => (item.entry.f & mask) === mask
const hasType = (item: Ranked, types: ReadonlySet<string>) =>
  types.size === 0 || types.has(item.entry.t)

export function applyFilters(all: Ranked[], filters: Filters): Ranked[] {
  return all.filter(
    (item) =>
      inRadius(item, filters.radius) &&
      hasAmenities(item, filters.amenities) &&
      hasType(item, filters.types),
  )
}

/**
 * Facet counts for the filter chips: each count answers "how many would I get
 * if I turned this on?", so it ignores that facet's own selection but respects
 * every other one. Without this a chip can promise results that a second filter
 * has already ruled out.
 */
export function facetCounts(all: Ranked[], filters: Filters) {
  const nearby = all.filter((item) => inRadius(item, filters.radius))

  const types = new Map<string, number>()
  for (const item of nearby) {
    if (!hasAmenities(item, filters.amenities)) continue
    types.set(item.entry.t, (types.get(item.entry.t) ?? 0) + 1)
  }

  const amenities = {} as Record<keyof typeof NEAR_FLAGS, number>
  for (const [name, bit] of Object.entries(NEAR_FLAGS) as [keyof typeof NEAR_FLAGS, number][]) {
    // Other amenities still apply; this one is what's being counted.
    const others = filters.amenities & ~bit
    amenities[name] = nearby.filter(
      (item) => hasType(item, filters.types) && hasAmenities(item, others) && item.entry.f & bit,
    ).length
  }

  return { types, amenities }
}

/**
 * Review-weighted rating — the Bayesian average IMDb and others use. A place
 * with few reviews is pulled toward the overall mean, so 5.0 from two people
 * doesn't outrank 4.7 from three thousand. `weight` is roughly "how many
 * reviews before a place's own rating counts for more than the prior".
 */
export function weightedRating(rating: number, reviews: number, mean: number, weight = 20): number {
  return (reviews / (reviews + weight)) * rating + (weight / (reviews + weight)) * mean
}

export function meanRating(entries: NearEntry[]): number {
  const rated = entries.filter((entry) => entry.r !== null)
  if (rated.length === 0) return 0
  return rated.reduce((sum, entry) => sum + (entry.r as number), 0) / rated.length
}

export function sortRanked(items: Ranked[], sort: SortKey, mean: number): Ranked[] {
  const byName = (a: Ranked, b: Ranked) => a.entry.n.localeCompare(b.entry.n)
  const copy = [...items]

  if (sort === 'nearest') return copy.sort((a, b) => a.miles - b.miles || byName(a, b))
  if (sort === 'reviews') {
    return copy.sort((a, b) => b.entry.v - a.entry.v || a.miles - b.miles || byName(a, b))
  }

  // Unrated places have nothing to rank on, so they trail rather than being
  // guessed at the mean and interleaved with genuinely rated ones.
  const score = (item: Ranked) =>
    item.entry.r === null ? -1 : weightedRating(item.entry.r, item.entry.v, mean)
  return copy.sort((a, b) => score(b) - score(a) || a.miles - b.miles || byName(a, b))
}

/**
 * What we have around an origin, ignoring the visitor's filters: the "supply"
 * side of the demand-vs-supply report. Filters are left out on purpose — the
 * question is how well the directory covers the area, not what one visitor
 * happened to narrow the list to.
 */
export function summarizeSupply(all: Ranked[]): Supply {
  const supply: Supply = { nearest: null, within10: 0, within25: 0, within50: 0, byType: {} }
  for (const { entry, miles } of all) {
    if (supply.nearest === null || miles < supply.nearest) supply.nearest = miles
    if (miles <= 10) supply.within10++
    if (miles <= 25) {
      supply.within25++
      supply.byType[entry.t] = (supply.byType[entry.t] ?? 0) + 1
    }
    if (miles <= 50) supply.within50++
  }
  if (supply.nearest !== null) supply.nearest = Math.round(supply.nearest * 10) / 10
  return supply
}

export const round3 = (value: number) => Math.round(value * 1000) / 1000
