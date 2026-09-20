/**
 * Turns what a visitor types — a ZIP code or a city — into coordinates.
 *
 * Resolved against Census tables bundled with the site (see
 * scripts/build-geo-data.ts) rather than a geocoding API: no per-lookup cost,
 * no key, nothing to rate-limit, and it works for any US town, not only the
 * ones AllParx has places for.
 */
import zipRows from '@/data/us-zips.json'
import placeRows from '@/data/us-places.json'
import { US_STATE_NAMES } from './us-states'

export type LocationMatch = { label: string; lat: number; lng: number }

type PlaceRow = { name: string; state: string; lat: number; lng: number; area: number }

/** Lowercase, drop accents, periods and apostrophes; "St."/"Ft."/"Mt." spell out. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^st /, 'saint ')
    .replace(/^ft /, 'fort ')
    .replace(/^mt /, 'mount ')
}

// The JSON is stored as tuples to keep the file small; lift it into lookups
// once per server instance, not once per request.
const ZIPS = new Map<string, [number, number]>(
  (zipRows as unknown as [string, number, number][]).map(([zip, lat, lng]) => [zip, [lat, lng]]),
)

const PLACES = new Map<string, PlaceRow[]>()
for (const [name, state, lat, lng, area] of placeRows as unknown as [
  string,
  string,
  number,
  number,
  number,
][]) {
  const key = normalize(name)
  const bucket = PLACES.get(key)
  const row = { name, state, lat, lng, area }
  if (bucket) bucket.push(row)
  else PLACES.set(key, [row])
}

const STATE_ABBRS = new Set(Object.keys(US_STATE_NAMES))
const STATE_BY_NAME = new Map(
  Object.entries(US_STATE_NAMES).map(([abbr, name]) => [normalize(name), abbr]),
)

/** "tx", "TX", "Texas" and "texas" all resolve to "TX". */
function parseState(value: string): string | null {
  const key = normalize(value)
  if (key.length === 2 && STATE_ABBRS.has(key.toUpperCase())) return key.toUpperCase()
  return STATE_BY_NAME.get(key) ?? null
}

/** Bigger land area first: for a shared name that is nearly always the city meant. */
function lookupPlace(name: string, state: string | null): PlaceRow[] {
  const rows = PLACES.get(normalize(name)) ?? []
  return rows.filter((row) => !state || row.state === state).sort((a, b) => b.area - a.area)
}

/**
 * Candidate readings of a free-text query, most likely first. "New York" is a
 * whole name but "Austin TX" is a name plus a state, and both arrive without
 * punctuation, so try the whole string before peeling a state off the end.
 */
function readings(query: string): { name: string; state: string | null }[] {
  const out: { name: string; state: string | null }[] = []

  const [beforeComma, ...afterComma] = query.split(',')
  if (afterComma.length > 0) {
    const state = parseState(afterComma.join(' '))
    // "Austin, Texas" pins the state; "Austin, USA" just contributes a name.
    out.push({ name: beforeComma, state })
    return out
  }

  out.push({ name: query, state: null })

  const words = query.split(' ')
  for (const take of [1, 2]) {
    if (words.length <= take) continue
    const state = parseState(words.slice(-take).join(' '))
    if (state) out.push({ name: words.slice(0, -take).join(' '), state })
  }
  return out
}

/**
 * Up to six matches, best first. Several means the name is shared — the caller
 * uses the first and offers the rest as "did you mean".
 */
export function resolveLocation(raw: string): LocationMatch[] {
  const query = raw.trim().replace(/\s+/g, ' ')
  if (query.length < 2 || query.length > 100) return []

  const zip = /^(\d{5})(?:-\d{4})?$/.exec(query)
  if (zip) {
    const hit = ZIPS.get(zip[1])
    return hit ? [{ label: `ZIP ${zip[1]}`, lat: hit[0], lng: hit[1] }] : []
  }

  // "DC" alone isn't a place name in the Census table.
  if (normalize(query) === 'dc') return resolveLocation('Washington, DC')

  for (const { name, state } of readings(query)) {
    const rows = lookupPlace(name, state)
    if (rows.length === 0) continue

    const seen = new Set<string>()
    const matches: LocationMatch[] = []
    for (const row of rows) {
      const label = `${row.name}, ${row.state}`
      if (seen.has(label)) continue
      seen.add(label)
      matches.push({ label, lat: row.lat, lng: row.lng })
      if (matches.length === 6) break
    }
    return matches
  }
  return []
}
