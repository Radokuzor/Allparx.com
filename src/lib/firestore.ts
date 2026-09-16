import 'server-only'
import { db } from './firebase-admin'
import { snapshotBySlug, snapshotPlaces } from './places-snapshot'
import type { Place } from './types'

export type { Place }

const COLLECTION = 'places'

/**
 * Every function here answers from the build-time snapshot when one exists
 * (see scripts/snapshot-places.ts) and queries Firestore otherwise.
 *
 * The snapshot path matters: a static build renders ~1 page per place, and
 * querying per page costs tens of thousands of document reads — enough to
 * exhaust the daily quota in one build. One scan up front costs one read per
 * document total.
 */

function grpcCode(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null
    ? (error as { code?: number }).code
    : undefined
}

/**
 * Firestore returns NOT_FOUND (5) when the project has no database yet, and
 * RESOURCE_EXHAUSTED (8) when the daily quota is gone. Neither should abort a
 * build halfway through; both render as "no data" with a loud warning. Any
 * other error still propagates.
 */
async function resilient<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch (error: unknown) {
    const code = grpcCode(error)
    if (code === 5) {
      console.warn(`[firestore] ${label}: no database or collection yet — returning empty result`)
      return fallback
    }
    if (code === 8) {
      console.warn(
        `[firestore] ${label}: QUOTA EXCEEDED — returning empty result. ` +
          'Run `npm run snapshot` so the build reads Firestore once instead of per page.',
      )
      return fallback
    }
    throw error
  }
}

/**
 * Runs an ordered query, falling back to an unordered fetch plus an in-memory
 * sort when the composite index is missing (FAILED_PRECONDITION, 9). The
 * indexes in firestore.indexes.json are the intended path; this only keeps
 * pages rendering until they are built, and reads more than it returns.
 */
async function orderedOrSorted(
  label: string,
  indexed: () => Promise<FirebaseFirestore.QuerySnapshot>,
  unordered: () => Promise<FirebaseFirestore.QuerySnapshot>,
  limit: number,
): Promise<Place[]> {
  try {
    const snapshot = await indexed()
    return snapshot.docs.map((doc) => doc.data() as Place)
  } catch (error: unknown) {
    if (grpcCode(error) !== 9) throw error
    console.warn(
      `[firestore] ${label}: composite index missing — sorting in memory. ` +
        'Deploy firestore.indexes.json to remove this fallback.',
    )
    const snapshot = await unordered()
    return sortByRating(snapshot.docs.map((doc) => doc.data() as Place)).slice(0, limit)
  }
}

/** Highest rated first; unrated places sort last rather than as zero-star. */
function sortByRating(places: Place[]): Place[] {
  return [...places].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
}

// --- Queries ---------------------------------------------------------------

export async function getPlace(slug: string): Promise<Place | null> {
  const index = snapshotBySlug()
  if (index) return index.get(slug) ?? null

  return resilient(
    `getPlace(${slug})`,
    async () => {
      const doc = await db.collection(COLLECTION).doc(slug).get()
      return doc.exists ? (doc.data() as Place) : null
    },
    null,
  )
}

export async function getPlacesByCity(city: string, limit = 24): Promise<Place[]> {
  const all = snapshotPlaces()
  if (all) return sortByRating(all.filter((p) => p.city === city)).slice(0, limit)

  return resilient(
    `getPlacesByCity(${city})`,
    () =>
      orderedOrSorted(
        `getPlacesByCity(${city})`,
        () =>
          db
            .collection(COLLECTION)
            .where('city', '==', city)
            .orderBy('rating', 'desc')
            .limit(limit)
            .get(),
        () => db.collection(COLLECTION).where('city', '==', city).get(),
        limit,
      ),
    [],
  )
}

export async function getPlacesByType(placeType: string, limit = 24): Promise<Place[]> {
  const all = snapshotPlaces()
  if (all) return sortByRating(all.filter((p) => p.placeType === placeType)).slice(0, limit)

  return resilient(
    `getPlacesByType(${placeType})`,
    () =>
      orderedOrSorted(
        `getPlacesByType(${placeType})`,
        () =>
          db
            .collection(COLLECTION)
            .where('placeType', '==', placeType)
            .orderBy('rating', 'desc')
            .limit(limit)
            .get(),
        () => db.collection(COLLECTION).where('placeType', '==', placeType).get(),
        limit,
      ),
    [],
  )
}

/** Same-city places of the same type, minus the one being viewed. */
export async function getNearbyPlaces(place: Place, limit = 6): Promise<Place[]> {
  const all = snapshotPlaces()
  if (all) {
    return sortByRating(
      all.filter(
        (p) => p.city === place.city && p.placeType === place.placeType && p.slug !== place.slug,
      ),
    ).slice(0, limit)
  }

  return resilient(
    `getNearbyPlaces(${place.slug})`,
    async () => {
      const snapshot = await db
        .collection(COLLECTION)
        .where('city', '==', place.city)
        .where('placeType', '==', place.placeType)
        .limit(limit + 1)
        .get()
      return snapshot.docs
        .map((doc) => doc.data() as Place)
        .filter((p) => p.slug !== place.slug)
        .slice(0, limit)
    },
    [],
  )
}

export async function getAllPlaceSlugs(): Promise<string[]> {
  const all = snapshotPlaces()
  if (all) return all.map((p) => p.slug)

  return resilient(
    'getAllPlaceSlugs',
    async () => {
      const snapshot = await db.collection(COLLECTION).select('slug').get()
      return snapshot.docs.map((doc) => doc.data().slug as string)
    },
    [],
  )
}

/** Minimal projection for the sitemap — never pulls full documents. */
export async function getAllPlaceRefs(): Promise<
  { slug: string; city: string; placeType: string }[]
> {
  const all = snapshotPlaces()
  if (all) return all.map(({ slug, city, placeType }) => ({ slug, city, placeType }))

  return resilient(
    'getAllPlaceRefs',
    async () => {
      const snapshot = await db.collection(COLLECTION).select('slug', 'city', 'placeType').get()
      return snapshot.docs.map((doc) => {
        const d = doc.data()
        return { slug: d.slug as string, city: d.city as string, placeType: d.placeType as string }
      })
    },
    [],
  )
}

/**
 * Distinct cities, alphabetised.
 *
 * Without a snapshot this scans the whole collection, so the result is
 * memoised per process — it is called from the homepage, both city routes,
 * the sitemap and llms.txt.
 */
let citiesPromise: Promise<string[]> | null = null

export async function getAllCities(): Promise<string[]> {
  const all = snapshotPlaces()
  if (all) return [...new Set(all.map((p) => p.city))].sort()

  citiesPromise ??= resilient(
    'getAllCities',
    async () => {
      const snapshot = await db.collection(COLLECTION).select('city').get()
      return [...new Set(snapshot.docs.map((doc) => doc.data().city as string))].sort()
    },
    [],
  ).catch((error) => {
    citiesPromise = null // don't cache a hard failure
    throw error
  })

  return citiesPromise
}

/** URL-safe form of a city name, e.g. "Salt Lake City" -> "salt-lake-city". */
export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
