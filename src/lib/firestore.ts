import 'server-only'
import { FieldPath } from 'firebase-admin/firestore'
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
  offset: number,
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
    return sortByRating(snapshot.docs.map((doc) => doc.data() as Place)).slice(offset, offset + limit)
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

/** `limit` omitted fetches every place in the city — the largest city is ~300, so this is one query either way. */
export async function getPlacesByCity(city: string, limit?: number): Promise<Place[]> {
  const all = snapshotPlaces()
  if (all) {
    const matches = sortByRating(all.filter((p) => p.city === city))
    return limit === undefined ? matches : matches.slice(0, limit)
  }

  return resilient(
    `getPlacesByCity(${city})`,
    () =>
      orderedOrSorted(
        `getPlacesByCity(${city})`,
        () => {
          let query = db.collection(COLLECTION).where('city', '==', city).orderBy('rating', 'desc')
          if (limit !== undefined) query = query.limit(limit)
          return query.get()
        },
        () => db.collection(COLLECTION).where('city', '==', city).get(),
        0,
        limit ?? Number.MAX_SAFE_INTEGER,
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
        0,
        limit,
      ),
    [],
  )
}

/** Category page size. Kept with the query so the page components, sitemap and generateStaticParams agree on it. */
export const CATEGORY_PAGE_SIZE = 48

/** Page 1 is served from `getPlacesByType`'s route; this backs `/places/category/[type]/page/[page]`. */
export async function getPlacesByTypePage(
  placeType: string,
  page: number,
  pageSize = CATEGORY_PAGE_SIZE,
): Promise<{ items: Place[]; total: number }> {
  const offset = (page - 1) * pageSize
  const all = snapshotPlaces()
  if (all) {
    const matches = sortByRating(all.filter((p) => p.placeType === placeType))
    return { items: matches.slice(offset, offset + pageSize), total: matches.length }
  }

  return resilient(
    `getPlacesByTypePage(${placeType}, ${page})`,
    async () => {
      const [items, countSnapshot] = await Promise.all([
        orderedOrSorted(
          `getPlacesByTypePage(${placeType}, ${page})`,
          () =>
            db
              .collection(COLLECTION)
              .where('placeType', '==', placeType)
              .orderBy('rating', 'desc')
              .offset(offset)
              .limit(pageSize)
              .get(),
          () => db.collection(COLLECTION).where('placeType', '==', placeType).get(),
          offset,
          pageSize,
        ),
        db.collection(COLLECTION).where('placeType', '==', placeType).count().get(),
      ])
      return { items, total: countSnapshot.data().count }
    },
    { items: [], total: 0 },
  )
}

/** Every place of one type in one city — used by `/cities/[city]/[type]`. Largest combo is ~20, so never paginated. */
export async function getPlacesByCityAndType(city: string, placeType: string): Promise<Place[]> {
  const all = snapshotPlaces()
  if (all) return sortByRating(all.filter((p) => p.city === city && p.placeType === placeType))

  return resilient(
    `getPlacesByCityAndType(${city}, ${placeType})`,
    () =>
      orderedOrSorted(
        `getPlacesByCityAndType(${city}, ${placeType})`,
        () =>
          db
            .collection(COLLECTION)
            .where('city', '==', city)
            .where('placeType', '==', placeType)
            .orderBy('rating', 'desc')
            .get(),
        () =>
          db
            .collection(COLLECTION)
            .where('city', '==', city)
            .where('placeType', '==', placeType)
            .get(),
        0,
        Number.MAX_SAFE_INTEGER,
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

/**
 * Every place whose name matches a legacy slug's base name.
 *
 * Powers the disambiguation page: `/places/lincoln-park-33` was one of 33
 * places called "Lincoln Park" and the slug cannot say which, so the page
 * lists all of them instead of guessing.
 *
 * Slug is the document id and city-swept slugs are `<name>-<city>`, so a
 * prefix range over the id finds every candidate in one indexed query rather
 * than scanning the collection. `` is the highest code point Firestore
 * will sort, which makes it the standard prefix-range terminator.
 */
export async function findPlacesByBaseName(base: string, limit = 30): Promise<Place[]> {
  if (!base) return []

  const matches = (place: Place) =>
    place.slug === base ||
    place.slug.startsWith(`${base}-`) ||
    citySlug(place.name) === base

  const all = snapshotPlaces()
  if (all) return all.filter(matches).slice(0, limit)

  return resilient(
    `findPlacesByBaseName(${base})`,
    async () => {
      const snapshot = await db
        .collection(COLLECTION)
        .orderBy(FieldPath.documentId())
        .startAt(base)
        .endAt(`${base}`)
        .limit(limit * 2)
        .get()
      return snapshot.docs
        .map((doc) => plainPlace(doc.data()))
        .filter(matches)
        .slice(0, limit)
    },
    [],
  )
}

/**
 * Drops Firestore Timestamps (createdAt, updatedAt, photoCheckedAt) so the
 * result can be handed to a Client Component.
 *
 * The build snapshot is plain JSON, but any page rendered on demand reads
 * live Firestore, where those fields are class instances that React refuses
 * to serialise — which turned every disambiguation page into a 500 in
 * production while passing in every snapshot-backed local test.
 */
function plainPlace(data: FirebaseFirestore.DocumentData): Place {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => !(value && typeof value === 'object' && 'toDate' in value),
    ),
  ) as Place
}

/** Slugs are lossy (`salt-lake-city`), so resolve back through the known set. */
export async function resolveCity(slug: string): Promise<string | null> {
  const cities = await getAllCities()
  return cities.find((c) => citySlug(c) === slug) ?? null
}

/** URL-safe form of a city name, e.g. "Salt Lake City" -> "salt-lake-city". */
export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
