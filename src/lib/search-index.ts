/**
 * Client-side search over the static index that `scripts/snapshot-places.ts`
 * writes to `public/search-index.json` at build time.
 *
 * Everything here runs in the browser. The index is a CDN file, so a search
 * costs no Firestore reads and no API call — which is the whole reason
 * suggestions can fire on every keystroke.
 *
 * The suggestion dropdown and the /search results page share one loader and
 * one scorer, so the first suggestion is always the first result.
 */
import { citySlug } from './city-slug'
import { typeLabel } from './place-types'
import { SEARCH_INDEX_FILE } from './snapshot-path'

/** One place, with the short keys the snapshot script writes. */
export type SearchEntry = {
  s: string // slug
  n: string // name
  c: string // city
  t: string // placeType
  a: string // state
  r: number | null // rating
}

/**
 * An entry with its match text precomputed. Building these once at load time
 * keeps per-keystroke work to a substring scan over ~2k short strings.
 */
export type IndexedEntry = {
  entry: SearchEntry
  name: string
  city: string
  haystack: string
}

export type CityHit = { city: string; state: string; count: number }

/** Lowercase and strip accents so "Cañon" matches a typed "canon". */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function build(entries: SearchEntry[]): IndexedEntry[] {
  return entries.map((entry) => ({
    entry,
    name: normalize(entry.n),
    city: normalize(entry.c),
    haystack: normalize(`${entry.n} ${entry.c} ${entry.a} ${typeLabel(entry.t)}`),
  }))
}

let pending: Promise<IndexedEntry[]> | null = null

/**
 * Fetches and parses the index, once per page session however many components
 * ask for it. A failed load clears the cache so a later attempt can retry
 * rather than being stuck with a rejected promise.
 */
export function loadSearchIndex(): Promise<IndexedEntry[]> {
  pending ??= fetch(`/${SEARCH_INDEX_FILE}`)
    .then((response) => {
      if (!response.ok) throw new Error(`search index: ${response.status}`)
      return response.json() as Promise<SearchEntry[]>
    })
    .then(build)
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}

/** True when `needle` starts a word in `hay` — "oak" matches "Live Oak Park". */
function startsWord(hay: string, needle: string): boolean {
  let from = 0
  for (;;) {
    const at = hay.indexOf(needle, from)
    if (at === -1) return false
    if (at === 0 || !/[a-z0-9]/.test(hay[at - 1])) return true
    from = at + 1
  }
}

/**
 * Ranks places for a query. Every typed word must appear somewhere in the
 * name, city, state or category, so results never drift off-query; the score
 * then decides ordering.
 *
 * The tiers matter most while someone is still typing: a person typing "zil"
 * wants Zilker Park at the top, not every place in a city whose description
 * happens to contain those letters.
 */
export function rankPlaces(index: IndexedEntry[], query: string, limit: number): SearchEntry[] {
  const q = normalize(query).trim()
  if (q.length === 0) return []
  const terms = q.split(/\s+/)

  const hits: { entry: SearchEntry; score: number }[] = []
  for (const item of index) {
    if (!terms.every((term) => item.haystack.includes(term))) continue

    // Tiers rank first, rating only breaks ties inside a tier.
    //
    // Matches that land mid-word sit *below* a plain city or category match:
    // someone typing "hou" wants Houston's parks, not a historical landmark in
    // Georgia whose name happens to contain "House".
    let tier = 2 // matched on city, state or category rather than the name
    if (item.name.startsWith(q)) tier = 10
    else if (startsWord(item.name, q)) tier = 8
    else if (terms.every((term) => startsWord(item.name, term))) tier = 6
    else if (terms.every((term) => item.name.includes(term))) tier = 1 // mid-word only

    // A place in a city the query names beats an equally-scoring one somewhere
    // else: "hou" should reach Houston before a landmark called "… House".
    // Sits above the 0-5 rating so it orders within a tier, not across tiers.
    const local = item.city.startsWith(terms[0]) ? 50 : 0

    hits.push({ entry: item.entry, score: tier * 100 + local + (item.entry.r ?? 0) })
  }

  hits.sort((a, b) => b.score - a.score || a.entry.n.localeCompare(b.entry.n))
  return hits.slice(0, limit).map((hit) => hit.entry)
}

/**
 * Cities worth offering as a destination of their own. Someone typing "austin"
 * usually wants the city page, not the one place whose name contains "Austin",
 * so these are offered above the place matches.
 *
 * A city needs a real page's worth of places behind it — a single stray import
 * would otherwise suggest a near-empty page.
 */
const MIN_CITY_PLACES = 4

/** City totals depend only on the index, so count them once, not per keystroke. */
const cityCache = new WeakMap<IndexedEntry[], CityHit[]>()

function cities(index: IndexedEntry[]): CityHit[] {
  const cached = cityCache.get(index)
  if (cached) return cached

  const counts = new Map<string, CityHit>()
  for (const { entry } of index) {
    if (!entry.c) continue
    const key = `${entry.c}|${entry.a}`
    const hit = counts.get(key)
    if (hit) hit.count += 1
    else counts.set(key, { city: entry.c, state: entry.a, count: 1 })
  }

  const list = [...counts.values()].filter((hit) => hit.count >= MIN_CITY_PLACES)
  cityCache.set(index, list)
  return list
}

export function rankCities(index: IndexedEntry[], query: string, limit: number): CityHit[] {
  const q = normalize(query).trim()
  if (q.length === 0) return []

  const hits: { hit: CityHit; score: number }[] = []
  for (const hit of cities(index)) {
    const name = normalize(hit.city)
    // Only a prefix match — "par" should not pull up every city containing it.
    if (name.startsWith(q)) hits.push({ hit, score: 2000 + hit.count })
    else if (startsWord(name, q)) hits.push({ hit, score: 1000 + hit.count })
  }

  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit).map((h) => h.hit)
}

export function cityHref(hit: CityHit): string {
  return `/cities/${citySlug(hit.city)}`
}
