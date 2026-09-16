import 'server-only'
import { db } from './firebase-admin'

export type Place = {
  slug: string
  name: string
  city: string
  state: string | null
  placeType: string
  googlePlaceId: string
  address: string
  lat: number | null
  lng: number | null
  rating: number | null
  reviewCount: number
  types: string[]
  website: string | null
  phone: string | null
  hours: string[]
  description: string | null
  goodForChildren: boolean | null
  allowsDogs: boolean | null
  hasRestroom: boolean | null
  parking: Record<string, boolean> | null
  photoReference: string | null
}

const COLLECTION = 'places'

/**
 * Firestore returns gRPC NOT_FOUND (5) when the project has no database yet.
 * Until the first ingestion has run, treat that as "no data" so `next build`
 * and preview deploys still succeed instead of failing on every page. Any
 * other error — permissions, a missing index, network — still propagates.
 */
async function tolerateEmptyBackend<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch (error: unknown) {
    if (grpcCode(error) === 5) {
      console.warn(`[firestore] ${label}: no database or collection yet — returning empty result`)
      return fallback
    }
    throw error
  }
}

function grpcCode(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null
    ? (error as { code?: number }).code
    : undefined
}

/**
 * Runs an ordered query, falling back to an unordered fetch plus an in-memory
 * sort when the composite index is missing (gRPC FAILED_PRECONDITION, 9).
 *
 * The indexes in `firestore.indexes.json` are the intended path — they let
 * Firestore apply the ordering and limit server-side. This fallback only keeps
 * pages rendering until those indexes are built, and reads more documents than
 * it returns, so it should not be relied on in production.
 */
async function orderedOrSorted<T>(
  label: string,
  indexed: () => Promise<FirebaseFirestore.QuerySnapshot>,
  unordered: () => Promise<FirebaseFirestore.QuerySnapshot>,
  sortKey: (value: T) => number,
  limit: number,
): Promise<T[]> {
  try {
    const snapshot = await indexed()
    return snapshot.docs.map((doc) => doc.data() as T)
  } catch (error: unknown) {
    if (grpcCode(error) !== 9) throw error
    console.warn(
      `[firestore] ${label}: composite index missing — sorting in memory. ` +
        'Deploy firestore.indexes.json to remove this fallback.',
    )
    const snapshot = await unordered()
    return snapshot.docs
      .map((doc) => doc.data() as T)
      .sort((a, b) => sortKey(b) - sortKey(a))
      .slice(0, limit)
  }
}

/** Unrated places sort last rather than being treated as zero-star. */
const byRating = (place: Place) => place.rating ?? -1

export async function getPlace(slug: string): Promise<Place | null> {
  return tolerateEmptyBackend(`getPlace(${slug})`, async () => {
    const doc = await db.collection(COLLECTION).doc(slug).get()
    if (!doc.exists) return null
    return doc.data() as Place
  }, null)
}

export async function getPlacesByCity(city: string, limit = 24): Promise<Place[]> {
  return tolerateEmptyBackend(
    `getPlacesByCity(${city})`,
    () =>
      orderedOrSorted<Place>(
        `getPlacesByCity(${city})`,
        () =>
          db.collection(COLLECTION).where('city', '==', city).orderBy('rating', 'desc').limit(limit).get(),
        () => db.collection(COLLECTION).where('city', '==', city).get(),
        byRating,
        limit,
      ),
    [],
  )
}

export async function getPlacesByType(placeType: string, limit = 24): Promise<Place[]> {
  return tolerateEmptyBackend(
    `getPlacesByType(${placeType})`,
    () =>
      orderedOrSorted<Place>(
        `getPlacesByType(${placeType})`,
        () =>
          db
            .collection(COLLECTION)
            .where('placeType', '==', placeType)
            .orderBy('rating', 'desc')
            .limit(limit)
            .get(),
        () => db.collection(COLLECTION).where('placeType', '==', placeType).get(),
        byRating,
        limit,
      ),
    [],
  )
}

/** Same-city places of the same type, minus the one being viewed. */
export async function getNearbyPlaces(place: Place, limit = 6): Promise<Place[]> {
  return tolerateEmptyBackend(`getNearbyPlaces(${place.slug})`, async () => {
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
  }, [])
}

export async function getAllPlaceSlugs(): Promise<string[]> {
  return tolerateEmptyBackend('getAllPlaceSlugs', async () => {
    const snapshot = await db.collection(COLLECTION).select('slug').get()
    return snapshot.docs.map((doc) => doc.data().slug as string)
  }, [])
}

/**
 * Minimal projection used by the sitemap so we never pull full documents for
 * what is only a list of URLs.
 */
export async function getAllPlaceRefs(): Promise<
  { slug: string; city: string; placeType: string }[]
> {
  return tolerateEmptyBackend('getAllPlaceRefs', async () => {
    const snapshot = await db.collection(COLLECTION).select('slug', 'city', 'placeType').get()
    return snapshot.docs.map((doc) => {
      const d = doc.data()
      return { slug: d.slug as string, city: d.city as string, placeType: d.placeType as string }
    })
  }, [])
}

/** Distinct cities present in the collection, alphabetised. */
export async function getAllCities(): Promise<string[]> {
  return tolerateEmptyBackend('getAllCities', async () => {
    const snapshot = await db.collection(COLLECTION).select('city').get()
    const cities = new Set<string>()
    for (const doc of snapshot.docs) cities.add(doc.data().city as string)
    return [...cities].sort()
  }, [])
}

/** URL-safe form of a city name, e.g. "Salt Lake City" -> "salt-lake-city". */
export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
