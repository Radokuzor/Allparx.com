/**
 * Resolving a place by *name* rather than by map position.
 *
 * `ingest-places.ts` sweeps a radius around each of the 50 metros, which is the
 * right shape for municipal parks and the wrong shape for anything people
 * travel to on purpose: a landmark an hour outside a metro is invisible to it,
 * however famous. Both `restore-legacy.ts` (recovering indexed URLs) and
 * `ingest-landmarks.ts` (adding destinations) instead start from a name and ask
 * Text Search where it is, so this is the machinery they share.
 *
 * The guard in `confidence()` is the important part. Text Search is fuzzy and
 * never returns nothing — ask it for "banyan tree" and it will hand back a
 * Florida housing development with total confidence. Publishing that under a
 * URL that ranks is worse than publishing nothing, so a result is only accepted
 * when the name it returns reduces back to the name that was asked for.
 */
import * as admin from 'firebase-admin'
import axios from 'axios'
import { PLACE_TYPES } from '../../src/lib/place-types'
import { US_STATE_NAMES, isInUnitedStates } from '../../src/lib/us-states'

export const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.primaryType',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.regularOpeningHours',
  'places.photos',
  'places.editorialSummary',
  'places.goodForChildren',
  'places.allowsDogs',
  'places.restroom',
  'places.parkingOptions',
].join(',')

type AddressComponent = { longText?: string; shortText?: string; types?: string[] }

export type GooglePlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  addressComponents?: AddressComponent[]
  location?: { latitude?: number; longitude?: number }
  rating?: number
  userRatingCount?: number
  types?: string[]
  primaryType?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  photos?: { name?: string }[]
  editorialSummary?: { text?: string }
  goodForChildren?: boolean
  allowsDogs?: boolean
  restroom?: boolean
  parkingOptions?: Record<string, boolean>
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let apiCalls = 0
export function apiCallCount(): number {
  return apiCalls
}

export async function searchByText(query: string, apiKey: string): Promise<GooglePlace[]> {
  apiCalls++
  try {
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      { textQuery: query, maxResultCount: 5, regionCode: 'US' },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        timeout: 20000,
      },
    )
    return response.data.places ?? []
  } catch (error: unknown) {
    const detail = axios.isAxiosError(error)
      ? (error.response?.data?.error?.message ?? error.message)
      : error instanceof Error
        ? error.message
        : String(error)
    console.error(`   ✖ Places API: ${detail}`)
    return []
  }
}

// --- Slugs and matching ----------------------------------------------------

/**
 * The legacy slug format: the place name alone, no city suffix. Indexed URLs
 * use it, so restored documents must key on it exactly.
 */
export function legacySlug(name: string): string {
  return name
    .toLowerCase()
    // Fold diacritics to their base letter before stripping, or the letter is
    // lost rather than simplified: "Nā Pali" would otherwise slug to "npali".
    // WordPress transliterated the same way, so this also matches legacy URLs
    // more often, never less.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** WordPress appended -2, -3 … to disambiguate duplicate titles. */
export function stripDedupeSuffix(slug: string): string {
  return slug.replace(/-\d+$/, '')
}

export function isAmbiguous(slug: string): boolean {
  return /-\d+$/.test(slug)
}

/** Comparison key that ignores punctuation and spacing entirely. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export type Confidence = 'exact' | 'strong' | 'reject'

export function confidence(requestedSlug: string, returnedName: string): Confidence {
  const base = stripDedupeSuffix(requestedSlug)
  const returned = legacySlug(returnedName)
  if (returned === base) return 'exact'
  if (normalize(returned) === normalize(base)) return 'strong'
  return 'reject'
}

/**
 * Picks the result whose name actually matches, not simply the first one.
 * Non-US results are dropped before scoring: `regionCode` only biases the
 * search, and a name-perfect match in the UK is still the wrong place.
 */
export function bestMatch(
  slug: string,
  results: GooglePlace[],
): { place: GooglePlace; score: Confidence } | undefined {
  return results
    .filter((place) =>
      isInUnitedStates(place.location?.latitude ?? null, place.location?.longitude ?? null),
    )
    .map((place) => ({ place, score: confidence(slug, place.displayName?.text ?? '') }))
    .sort((a, b) => (a.score === 'exact' ? -1 : b.score === 'exact' ? 1 : 0))
    .find((s) => s.score !== 'reject')
}

// --- Mapping ---------------------------------------------------------------

function component(place: GooglePlace, type: string, short = false): string | null {
  const match = place.addressComponents?.find((c) => c.types?.includes(type))
  return (short ? match?.shortText : match?.longText) ?? null
}

/**
 * Name-resolved places routinely fall outside the outdoor categories — the
 * Kawela Bay banyan is a `tourist_attraction`, not a `park`. When a result maps
 * to one of ours we use it; otherwise we keep Google's own primary type.
 * Category pages only iterate PLACE_TYPES, so an off-category place stays
 * reachable at its own URL without appearing in the outdoor nav.
 */
export function resolvePlaceType(place: GooglePlace): { placeType: string; onBrand: boolean } {
  const outdoor = (place.types ?? []).find((t) => (PLACE_TYPES as readonly string[]).includes(t))
  if (outdoor) return { placeType: outdoor, onBrand: true }
  return { placeType: place.primaryType ?? place.types?.[0] ?? 'point_of_interest', onBrand: false }
}

export type DocumentOrigin = {
  /** Restored from an indexed URL the previous site had. */
  legacy?: boolean
  /** Added from the curated landmark list rather than a metro sweep. */
  landmark?: boolean
}

export function toDocument(place: GooglePlace, slug: string, origin: DocumentOrigin = {}) {
  const { placeType, onBrand } = resolvePlaceType(place)
  const state = component(place, 'administrative_area_level_1', true)
  // Rivers, reservoirs and mountains have no locality. Fall back to the state
  // name rather than "Unknown", which would surface in breadcrumbs, headings,
  // schema addressLocality and a /cities/unknown page.
  const city =
    component(place, 'locality') ??
    component(place, 'sublocality') ??
    component(place, 'administrative_area_level_2') ??
    (state ? (US_STATE_NAMES[state] ?? state) : 'United States')

  return {
    slug,
    name: place.displayName?.text ?? 'Unknown Place',
    city,
    state,
    placeType,
    googlePlaceId: place.id ?? null,
    address: place.formattedAddress ?? '',
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? 0,
    types: place.types ?? [],
    website: place.websiteUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    description: place.editorialSummary?.text ?? null,
    goodForChildren: place.goodForChildren ?? null,
    allowsDogs: place.allowsDogs ?? null,
    hasRestroom: place.restroom ?? null,
    parking: place.parkingOptions ?? null,
    photoReference: place.photos?.[0]?.name ?? null,
    legacy: origin.legacy ?? false,
    landmark: origin.landmark ?? false,
    onBrand,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
}
