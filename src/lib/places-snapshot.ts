import 'server-only'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Place } from './types'
import { SNAPSHOT_PATH } from './snapshot-path'

/**
 * Build-time snapshot of the `places` collection, produced by
 * `scripts/snapshot-places.ts`.
 *
 * Loaded once per process and held in memory. Next.js builds with several
 * workers, so this costs one file read per worker and zero Firestore reads,
 * against the tens of thousands a per-page query strategy would need.
 *
 * Returns null when there is no snapshot — dev servers and ISR revalidation
 * fall through to live Firestore queries.
 */

let loaded = false
let places: Place[] | null = null

export function snapshotPlaces(): Place[] | null {
  if (loaded) return places
  loaded = true

  // The snapshot is only read during the build; ISR falls back to Firestore.
  // Without this opt-out Turbopack traces the whole project into the server
  // bundle, because process.cwd() reads as a dynamic path.
  const file = path.resolve(/*turbopackIgnore: true*/ process.cwd(), SNAPSHOT_PATH)
  try {
    if (!fs.existsSync(file)) return (places = null)
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      generatedAt?: string
      places?: Place[]
    }
    if (!Array.isArray(parsed.places)) return (places = null)
    places = parsed.places
    console.log(
      `[snapshot] serving ${places.length} places from ${SNAPSHOT_PATH}` +
        (parsed.generatedAt ? ` (generated ${parsed.generatedAt})` : ''),
    )
    return places
  } catch (error) {
    console.warn(
      `[snapshot] could not read ${SNAPSHOT_PATH}, falling back to Firestore: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    )
    return (places = null)
  }
}

/** Slug → place, built lazily so lookups are O(1) across 1000s of pages. */
let index: Map<string, Place> | null = null

export function snapshotBySlug(): Map<string, Place> | null {
  const all = snapshotPlaces()
  if (!all) return null
  if (!index) index = new Map(all.map((place) => [place.slug, place]))
  return index
}
