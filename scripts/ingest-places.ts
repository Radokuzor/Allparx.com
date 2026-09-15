/**
 * AllParx ingestion — pulls outdoor places from Google Places API (New) and
 * writes one Firestore document per place, keyed by its URL slug.
 *
 * The script is idempotent: an existing slug is left untouched, so re-running
 * only fills gaps. Run a small slice first:
 *
 *   npm run ingest -- --cities=5
 *   npm run ingest -- --cities=5 --types=park,dog_park
 *   npm run ingest -- --dry-run          # hits Places API, writes nothing
 *   npm run ingest                       # all cities, all types
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

type City = { name: string; state: string; lat: number; lng: number }

// Top 50 US cities by population — expand this list as needed.
const US_CITIES: City[] = [
  { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.006 },
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.074 },
  { name: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { name: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  { name: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { name: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 },
  { name: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { name: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  { name: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308 },
  { name: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { name: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { name: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
  { name: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { name: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { name: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { name: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164 },
  { name: 'El Paso', state: 'TX', lat: 31.7619, lng: -106.485 },
  { name: 'Washington DC', state: 'DC', lat: 38.9072, lng: -77.0369 },
  { name: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { name: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { name: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585 },
  { name: 'Portland', state: 'OR', lat: 45.5051, lng: -122.675 },
  { name: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.049 },
  { name: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  { name: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { name: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.265 },
  { name: 'Tucson', state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { name: 'Fresno', state: 'CA', lat: 36.7378, lng: -119.7871 },
  { name: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944 },
  { name: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
  { name: 'Mesa', state: 'AZ', lat: 33.4152, lng: -111.8315 },
  { name: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 },
  { name: 'Omaha', state: 'NE', lat: 41.2565, lng: -95.9345 },
  { name: 'Colorado Springs', state: 'CO', lat: 38.8339, lng: -104.8214 },
  { name: 'Virginia Beach', state: 'VA', lat: 36.8529, lng: -75.978 },
  { name: 'Long Beach', state: 'CA', lat: 33.7701, lng: -118.1937 },
  { name: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
  { name: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 },
  { name: 'Aurora', state: 'CO', lat: 39.7294, lng: -104.8319 },
  { name: 'Wichita', state: 'KS', lat: 37.6872, lng: -97.3301 },
  { name: 'Bakersfield', state: 'CA', lat: 35.3733, lng: -119.0187 },
  { name: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
  { name: 'Honolulu', state: 'HI', lat: 21.3069, lng: -157.8583 },
  { name: 'Anchorage', state: 'AK', lat: 61.2181, lng: -149.9003 },
  { name: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.891 },
  { name: 'Boise', state: 'ID', lat: 43.615, lng: -116.2023 },
]

// --- CLI flags -------------------------------------------------------------

function flag(name: string): string | undefined {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  return hit?.split('=').slice(1).join('=')
}
const hasFlag = (name: string) => process.argv.slice(2).includes(`--${name}`)

const cityLimit = Number(flag('cities') ?? US_CITIES.length)
const typeFilter = flag('types')?.split(',').map((t) => t.trim()).filter(Boolean)
const dryRun = hasFlag('dry-run')

const cities = US_CITIES.slice(0, cityLimit)
const types: string[] = typeFilter ?? [...PLACE_TYPES]

// --- Helpers ---------------------------------------------------------------

/**
 * Slug format is load-bearing: existing allparx.com backlinks point at
 * /places/<name>-<city>, so this must stay byte-for-byte compatible.
 */
function slugify(name: string, city: string): string {
  return `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types',
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

type GooglePlace = Record<string, unknown> & {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  rating?: number
  userRatingCount?: number
  types?: string[]
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

/** Tracks types the API rejects so we stop paying for calls that can't work. */
const unsupportedTypes = new Set<string>()

async function fetchPlaces(city: City, placeType: string): Promise<GooglePlace[]> {
  const body = {
    includedTypes: [placeType],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: city.lat, longitude: city.lng },
        radius: 30000, // 30km
      },
    },
  }

  try {
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchNearby',
      body,
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
    // An invalid `includedTypes` value fails identically for every city, so
    // record it once and skip the type for the rest of the run.
    if (/includedTypes|Invalid.*type/i.test(String(detail))) {
      unsupportedTypes.add(placeType)
      console.error(`  ✖ "${placeType}" is not a valid Places type — skipping for the rest of the run`)
    } else {
      console.error(`  ✖ ${placeType} in ${city.name}: ${detail}`)
    }
    return []
  }
}

function toDocument(place: GooglePlace, city: City, placeType: string, slug: string) {
  return {
    slug,
    name: place.displayName?.text ?? 'Unknown Place',
    city: city.name,
    state: city.state,
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
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log('🌲 AllParx ingestion starting')
  console.log(`   Cities: ${cities.length}/${US_CITIES.length} | Types: ${types.length}`)
  console.log(`   Max Places API calls this run: ${cities.length * types.length}`)
  if (dryRun) console.log('   DRY RUN — nothing will be written to Firestore')
  console.log('')

  let saved = 0
  let skipped = 0
  let seen = 0

  for (const city of cities) {
    console.log(`\n🏙  ${city.name}, ${city.state}`)

    for (const placeType of types) {
      if (unsupportedTypes.has(placeType)) continue

      const places = await fetchPlaces(city, placeType)
      if (places.length === 0) {
        console.log(`   ${placeType}: none`)
        await sleep(200)
        continue
      }
      seen += places.length

      // Resolve slugs first, then read every doc in one round trip instead of
      // one `get()` per place.
      const slugged = places.map((p) => ({
        place: p,
        slug: slugify(p.displayName?.text ?? 'Unknown Place', city.name),
      }))

      // A city+type response can contain two places that slugify identically;
      // keep the first and drop the rest so the batch has unique doc refs.
      const unique = new Map<string, (typeof slugged)[number]>()
      for (const entry of slugged) if (!unique.has(entry.slug)) unique.set(entry.slug, entry)

      const refs = [...unique.keys()].map((slug) => db.collection('places').doc(slug))
      const existing = await db.getAll(...refs)
      const alreadyThere = new Set(existing.filter((d) => d.exists).map((d) => d.id))

      const toWrite = [...unique.values()].filter((e) => !alreadyThere.has(e.slug))
      skipped += unique.size - toWrite.length

      if (toWrite.length > 0 && !dryRun) {
        const batch = db.batch()
        for (const { place, slug } of toWrite) {
          batch.set(db.collection('places').doc(slug), toDocument(place, city, placeType, slug))
        }
        await batch.commit()
      }
      saved += toWrite.length

      console.log(
        `   ${placeType}: ${places.length} found, ${toWrite.length} new, ${unique.size - toWrite.length} already stored`,
      )

      await sleep(200) // stay well inside the Places API rate limit
    }
  }

  console.log('\n✅ Ingestion complete')
  console.log(`   Places returned by Google: ${seen}`)
  console.log(`   New documents written:     ${dryRun ? 0 : saved}${dryRun ? ` (would be ${saved})` : ''}`)
  console.log(`   Already present, skipped:  ${skipped}`)
  if (unsupportedTypes.size > 0) {
    console.log(`   Rejected place types:      ${[...unsupportedTypes].join(', ')}`)
  }
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
