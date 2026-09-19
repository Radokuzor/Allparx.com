/**
 * Legacy URL recovery — rebuilds place pages for URLs the previous
 * allparx.com had indexed, so Google's existing rankings resolve again.
 *
 * Background: the old site was a WordPress directory whose place URLs were
 * /places/<name>/ with no city segment. The current ingest writes
 * /places/<name>-<city>, so none of the old URLs resolve — and the analytics
 * data shows essentially all organic search traffic landing on those 404s.
 *
 * This script takes the dead slugs the site is actually being asked for,
 * resolves each one by name through Places Text Search, and writes it back
 * under its original slug. Unlike `ingest-places.ts` it searches by text
 * rather than by city radius, so places outside the top-50 metros resolve too.
 *
 * A wrong address on a page that ranks is worse than a 404, so a result is
 * only written when the name Google returns matches the slug that was asked
 * for. Everything else is reported as unresolved and left alone.
 *
 *   npm run restore -- --dry-run            # resolve, write nothing
 *   npm run restore -- --limit=25           # the 25 highest-value slugs
 *   npm run restore -- --organic-only       # only slugs Google sent users to
 *   npm run restore -- --limit=0            # everything (see the cost line)
 */
import * as admin from 'firebase-admin'
import axios from 'axios'
import * as dotenv from 'dotenv'
import { PLACE_TYPES } from '../src/lib/place-types'

dotenv.config({ path: '.env.local' })

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = admin.firestore()
const API_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!API_KEY) {
  console.error('✖ GOOGLE_PLACES_API_KEY is missing from .env.local')
  process.exit(1)
}

// --- Args ------------------------------------------------------------------

const args = process.argv.slice(2)
const flag = (name: string) => args.some((a) => a === `--${name}`)
const value = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

const dryRun = flag('dry-run')
const organicOnly = flag('organic-only')
/**
 * A -2/-33 suffix means WordPress was disambiguating N places that shared a
 * name, so the slug alone cannot say *which* Lincoln Park it was. Text Search
 * will still answer confidently — with the most famous one — which is how you
 * end up publishing Chicago's Lincoln Park at a slug that meant a municipal
 * park in Ohio. These are skipped unless explicitly asked for.
 */
const includeAmbiguous = flag('include-ambiguous')
/** 0 means no limit. Defaults to 25 so an unqualified run cannot spend much. */
const limit = Number(value('limit') ?? 25)
const minHits = Number(value('min-hits') ?? 1)

// --- Slug helpers ----------------------------------------------------------

/**
 * The legacy slug format: the place name alone, no city suffix. This is the
 * format the indexed URLs use, so restored documents must key on it exactly.
 */
function legacySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** WordPress appended -2, -3 … to disambiguate duplicate titles. */
function stripDedupeSuffix(slug: string): string {
  return slug.replace(/-\d+$/, '')
}

function isAmbiguous(slug: string): boolean {
  return /-\d+$/.test(slug)
}

function searchQuery(slug: string): string {
  return stripDedupeSuffix(slug).replace(/-/g, ' ')
}

/** Comparison key that ignores punctuation and spacing entirely. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

type Confidence = 'exact' | 'strong' | 'reject'

/**
 * Text Search is a fuzzy endpoint: given "t t cafe" it will happily return an
 * unrelated cafe. A result is only trustworthy when the name it returns
 * reduces back to the slug that was requested.
 */
function confidence(requestedSlug: string, returnedName: string): Confidence {
  const base = stripDedupeSuffix(requestedSlug)
  const returned = legacySlug(returnedName)
  if (returned === base) return 'exact'
  if (normalize(returned) === normalize(base)) return 'strong'
  return 'reject'
}

// --- Places API ------------------------------------------------------------

const FIELD_MASK = [
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

type GooglePlace = {
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let apiCalls = 0

async function searchByText(query: string): Promise<GooglePlace[]> {
  apiCalls++
  try {
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      { textQuery: query, maxResultCount: 5, regionCode: 'US' },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY as string,
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

// --- Mapping ---------------------------------------------------------------

function component(place: GooglePlace, type: string, short = false): string | null {
  const match = place.addressComponents?.find((c) => c.types?.includes(type))
  return (short ? match?.shortText : match?.longText) ?? null
}

/**
 * The old directory covered far more than outdoor places. When a result maps
 * to one of our categories we use it; otherwise we keep Google's own primary
 * type. Category pages only iterate PLACE_TYPES, so an off-category place
 * stays reachable at its own URL without appearing in the outdoor nav.
 */
function resolvePlaceType(place: GooglePlace): { placeType: string; onBrand: boolean } {
  const outdoor = (place.types ?? []).find((t) => (PLACE_TYPES as readonly string[]).includes(t))
  if (outdoor) return { placeType: outdoor, onBrand: true }
  return { placeType: place.primaryType ?? place.types?.[0] ?? 'point_of_interest', onBrand: false }
}

function toDocument(place: GooglePlace, slug: string) {
  const { placeType, onBrand } = resolvePlaceType(place)
  const city =
    component(place, 'locality') ??
    component(place, 'sublocality') ??
    component(place, 'administrative_area_level_2') ??
    'Unknown'

  return {
    slug,
    name: place.displayName?.text ?? 'Unknown Place',
    city,
    state: component(place, 'administrative_area_level_1', true),
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
    /** Marks a document restored from a legacy URL rather than a city sweep. */
    legacy: true,
    onBrand,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
}

// --- Demand ----------------------------------------------------------------

type Demand = { slug: string; hits: number; organic: number }

/** Count of slugs held back by the ambiguity guard, for the summary line. */
let ambiguousSkipped = 0

/**
 * The work queue is the site's own 404 log: every /places/<slug> the analytics
 * collection has seen that has no document behind it, ranked by how much real
 * search traffic it wasted.
 */
async function deadSlugsByDemand(): Promise<Demand[]> {
  const [placeSnap, visitSnap] = await Promise.all([
    db.collection('places').select('slug').get(),
    db.collection('analytics_visits').select('path', 'referrerHost', 'bot').get(),
  ])

  const live = new Set(placeSnap.docs.map((doc) => doc.id))
  const demand = new Map<string, Demand>()

  for (const doc of visitSnap.docs) {
    const visit = doc.data() as { path?: string; referrerHost?: string | null; bot?: boolean }
    const match = /^\/places\/([^/]+)\/?$/.exec(visit.path ?? '')
    if (!match) continue

    const slug = match[1]
    if (slug === 'category' || live.has(slug)) continue

    const entry = demand.get(slug) ?? { slug, hits: 0, organic: 0 }
    if (!visit.bot) entry.hits++
    if (visit.referrerHost === 'google.com') entry.organic++
    demand.set(slug, entry)
  }

  const wanted = [...demand.values()].filter(
    (d) => d.hits >= minHits && (!organicOnly || d.organic > 0),
  )
  const unambiguous = wanted.filter((d) => includeAmbiguous || !isAmbiguous(d.slug))
  ambiguousSkipped = wanted.length - unambiguous.length

  return unambiguous.sort((a, b) => b.organic - a.organic || b.hits - a.hits)
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log('🔁 AllParx legacy URL recovery\n')

  const queue = await deadSlugsByDemand()
  const batchQueue = limit > 0 ? queue.slice(0, limit) : queue

  console.log(`   Dead slugs with demand : ${queue.length}`)
  if (ambiguousSkipped > 0) {
    console.log(`   Held back as ambiguous : ${ambiguousSkipped} (name+number slugs — --include-ambiguous to force)`)
  }
  console.log(`   Attempting this run    : ${batchQueue.length}`)
  console.log(`   Max Places API calls   : ${batchQueue.length}`)
  if (dryRun) console.log('   DRY RUN — nothing will be written to Firestore')
  console.log('')

  let restored = 0
  let rejected = 0
  let notFound = 0
  const rejects: string[] = []

  for (const [i, entry] of batchQueue.entries()) {
    const position = `[${i + 1}/${batchQueue.length}]`
    const query = searchQuery(entry.slug)
    const results = await searchByText(query)

    if (results.length === 0) {
      notFound++
      console.log(`${position} ✖ ${entry.slug} — no Places result for "${query}"`)
      await sleep(200)
      continue
    }

    // Take the best-matching result, not simply the first.
    const scored = results
      .map((place) => ({ place, score: confidence(entry.slug, place.displayName?.text ?? '') }))
      .sort((a, b) => (a.score === 'exact' ? -1 : b.score === 'exact' ? 1 : 0))

    const best = scored.find((s) => s.score !== 'reject')

    if (!best) {
      rejected++
      rejects.push(`${entry.slug} → got "${results[0].displayName?.text ?? '?'}"`)
      console.log(`${position} ⚠ ${entry.slug} — no confident match, skipped`)
      await sleep(200)
      continue
    }

    const doc = toDocument(best.place, entry.slug)
    if (!dryRun) {
      await db.collection('places').doc(entry.slug).set(doc)
    }
    restored++
    console.log(
      `${position} ✓ ${entry.slug} → ${doc.name}, ${doc.city} ${doc.state ?? ''} ` +
        `(${best.score}, ${doc.placeType}${doc.onBrand ? '' : ', off-category'}, ${entry.organic} organic hits)`,
    )
    await sleep(200)
  }

  console.log('\n─────────────────────────────')
  console.log(`   Restored     : ${restored}`)
  console.log(`   No match     : ${rejected}`)
  console.log(`   No result    : ${notFound}`)
  console.log(`   API calls    : ${apiCalls}`)
  console.log(`   Remaining    : ${Math.max(0, queue.length - batchQueue.length)}`)

  if (rejects.length > 0) {
    console.log('\n   Rejected (name did not match the slug):')
    for (const line of rejects.slice(0, 20)) console.log(`     · ${line}`)
  }

  if (dryRun) console.log('\n   Dry run — re-run without --dry-run to write these.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
