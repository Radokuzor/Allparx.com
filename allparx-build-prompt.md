# ALLPARX.COM — FULL BUILD PROMPT
# Paste this entire file into your VS Code LLM (Claude Code / Copilot / Cursor)
# Work top to bottom. Do not skip steps.

---

## WHAT WE ARE BUILDING

A Next.js 14 outdoor recreation directory at allparx.com.
- Google Places API pulls park/outdoor data for every US city
- Data is stored in Firebase Firestore
- Next.js renders SEO-optimized static pages for each place
- URL structure: /places/[slug] (e.g. /places/zilker-park-austin)
- Deployed to Vercel, served through Cloudflare CDN

Stack:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Firebase Admin SDK (Firestore)
- Google Places API (New)
- Vercel deployment

create a sitemap and anything else to help with seo and ai discoverability
---

## ENVIRONMENT VARIABLES NEEDED

Create a .env.local file in the project root with these values
(I will fill in the actual values):

```
GOOGLE_PLACES_API_KEY=YOUR_KEY_HERE
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=YOUR_SERVICE_ACCOUNT_EMAIL
FIREBASE_PRIVATE_KEY=YOUR_PRIVATE_KEY
NEXT_PUBLIC_SITE_URL=https://allparx.com
```

---

## STEP 1 — SCAFFOLD THE PROJECT

Run this in terminal:

```bash
npx create-next-app@latest allparx --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd allparx
npm install firebase-admin axios dotenv
```

---

## STEP 2 — FIREBASE ADMIN SETUP

Create file: src/lib/firebase-admin.ts

```typescript
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const db = admin.firestore()
export default admin
```

---

## STEP 3 — THE INGESTION SCRIPT

This script calls Google Places API and writes every place to Firestore.
It targets all major US cities across all outdoor place types.

Create file: scripts/ingest-places.ts

```typescript
import * as admin from 'firebase-admin'
import axios from 'axios'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Initialize Firebase Admin
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
const API_KEY = process.env.GOOGLE_PLACES_API_KEY!

// Target place types — maps to allparx original URL categories
const PLACE_TYPES = [
  'park',
  'dog_park',
  'campground',
  'hiking_area',
  'beach',
  'rv_park',
  'national_park',
  'state_park',
  'nature_reserve',
  'sports_complex',
  'recreation_center',
  'picnic_ground',
  'fishing_area',
]

// Top 50 US cities by population — expand this list as needed
const US_CITIES = [
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'Houston', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix', lat: 33.4484, lng: -112.0740 },
  { name: 'Philadelphia', lat: 39.9526, lng: -75.1652 },
  { name: 'San Antonio', lat: 29.4241, lng: -98.4936 },
  { name: 'San Diego', lat: 32.7157, lng: -117.1611 },
  { name: 'Dallas', lat: 32.7767, lng: -96.7970 },
  { name: 'Austin', lat: 30.2672, lng: -97.7431 },
  { name: 'Jacksonville', lat: 30.3322, lng: -81.6557 },
  { name: 'Fort Worth', lat: 32.7555, lng: -97.3308 },
  { name: 'Columbus', lat: 39.9612, lng: -82.9988 },
  { name: 'Charlotte', lat: 35.2271, lng: -80.8431 },
  { name: 'Indianapolis', lat: 39.7684, lng: -86.1581 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321 },
  { name: 'Denver', lat: 39.7392, lng: -104.9903 },
  { name: 'Nashville', lat: 36.1627, lng: -86.7816 },
  { name: 'Oklahoma City', lat: 35.4676, lng: -97.5164 },
  { name: 'El Paso', lat: 31.7619, lng: -106.4850 },
  { name: 'Washington DC', lat: 38.9072, lng: -77.0369 },
  { name: 'Boston', lat: 42.3601, lng: -71.0589 },
  { name: 'Las Vegas', lat: 36.1699, lng: -115.1398 },
  { name: 'Louisville', lat: 38.2527, lng: -85.7585 },
  { name: 'Portland', lat: 45.5051, lng: -122.6750 },
  { name: 'Memphis', lat: 35.1495, lng: -90.0490 },
  { name: 'Atlanta', lat: 33.7490, lng: -84.3880 },
  { name: 'Miami', lat: 25.7617, lng: -80.1918 },
  { name: 'Minneapolis', lat: 44.9778, lng: -93.2650 },
  { name: 'Tucson', lat: 32.2226, lng: -110.9747 },
  { name: 'Fresno', lat: 36.7378, lng: -119.7871 },
  { name: 'Sacramento', lat: 38.5816, lng: -121.4944 },
  { name: 'Kansas City', lat: 39.0997, lng: -94.5786 },
  { name: 'Mesa', lat: 33.4152, lng: -111.8315 },
  { name: 'Raleigh', lat: 35.7796, lng: -78.6382 },
  { name: 'Omaha', lat: 41.2565, lng: -95.9345 },
  { name: 'Colorado Springs', lat: 38.8339, lng: -104.8214 },
  { name: 'Virginia Beach', lat: 36.8529, lng: -75.9780 },
  { name: 'Long Beach', lat: 33.7701, lng: -118.1937 },
  { name: 'Tampa', lat: 27.9506, lng: -82.4572 },
  { name: 'New Orleans', lat: 29.9511, lng: -90.0715 },
  { name: 'Aurora', lat: 39.7294, lng: -104.8319 },
  { name: 'Wichita', lat: 37.6872, lng: -97.3301 },
  { name: 'Bakersfield', lat: 35.3733, lng: -119.0187 },
  { name: 'Albuquerque', lat: 35.0844, lng: -106.6504 },
  { name: 'Honolulu', lat: 21.3069, lng: -157.8583 },
  { name: 'Anchorage', lat: 61.2181, lng: -149.9003 },
  { name: 'Salt Lake City', lat: 40.7608, lng: -111.8910 },
  { name: 'Boise', lat: 43.6150, lng: -116.2023 },
]

// Slugify a place name to match original allparx URL format
function slugify(name: string, city: string): string {
  return `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Sleep to respect API rate limits
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Fetch places from Google Places API (New) for a given city + type
async function fetchPlaces(city: { name: string; lat: number; lng: number }, placeType: string) {
  const url = 'https://places.googleapis.com/v1/places:searchNearby'

  const body = {
    includedTypes: [placeType],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: city.lat, longitude: city.lng },
        radius: 30000, // 30km radius
      },
    },
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': [
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
    ].join(','),
  }

  try {
    const response = await axios.post(url, body, { headers })
    return response.data.places || []
  } catch (error: any) {
    console.error(`Error fetching ${placeType} in ${city.name}:`, error.response?.data || error.message)
    return []
  }
}

// Write a single place to Firestore
async function savePlace(place: any, city: string, placeType: string) {
  const name = place.displayName?.text || 'Unknown Place'
  const slug = slugify(name, city)

  const docRef = db.collection('places').doc(slug)

  // Skip if already exists to avoid overwriting
  const existing = await docRef.get()
  if (existing.exists) {
    console.log(`  ⏭  Skipping existing: ${slug}`)
    return
  }

  const data = {
    slug,
    name,
    city,
    placeType,
    googlePlaceId: place.id,
    address: place.formattedAddress || '',
    lat: place.location?.latitude || null,
    lng: place.location?.longitude || null,
    rating: place.rating || null,
    reviewCount: place.userRatingCount || 0,
    types: place.types || [],
    website: place.websiteUri || null,
    phone: place.nationalPhoneNumber || null,
    hours: place.regularOpeningHours?.weekdayDescriptions || [],
    description: place.editorialSummary?.text || null,
    goodForChildren: place.goodForChildren || null,
    allowsDogs: place.allowsDogs || null,
    hasRestroom: place.restroom || null,
    parking: place.parkingOptions || null,
    photoReference: place.photos?.[0]?.name || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  await docRef.set(data)
  console.log(`  ✅ Saved: ${name} (${city}) → /places/${slug}`)
}

// Main runner
async function main() {
  console.log('🌲 AllParx Ingestion Script Starting...')
  console.log(`📍 Cities: ${US_CITIES.length} | Place Types: ${PLACE_TYPES.length}`)
  console.log(`📦 Estimated max places: ${US_CITIES.length * PLACE_TYPES.length * 20}\n`)

  let totalSaved = 0
  let totalSkipped = 0

  for (const city of US_CITIES) {
    console.log(`\n🏙  Processing: ${city.name}`)

    for (const placeType of PLACE_TYPES) {
      console.log(`  🔍 Fetching ${placeType}...`)
      const places = await fetchPlaces(city, placeType)
      console.log(`  📍 Found ${places.length} places`)

      for (const place of places) {
        await savePlace(place, city.name, placeType)
        totalSaved++
        await sleep(50) // small delay between writes
      }

      await sleep(200) // respect Places API rate limits between requests
    }
  }

  console.log(`\n✅ Ingestion complete!`)
  console.log(`📊 Total saved: ${totalSaved}`)
  console.log(`⏭  Total skipped: ${totalSkipped}`)
  process.exit(0)
}

main().catch(console.error)
```

Add this to package.json scripts:
```json
"ingest": "ts-node --project tsconfig.json scripts/ingest-places.ts"
```

Install ts-node:
```bash
npm install -D ts-node @types/node
```

Run the ingestion:
```bash
npm run ingest
```

---

## STEP 4 — NEXT.JS APP STRUCTURE

Create these files exactly as specified:

### src/lib/firestore.ts
(Client-side Firestore helper for any future client reads)

```typescript
import { db } from './firebase-admin'

export type Place = {
  slug: string
  name: string
  city: string
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
  parking: any
  photoReference: string | null
}

export async function getPlace(slug: string): Promise<Place | null> {
  const doc = await db.collection('places').doc(slug).get()
  if (!doc.exists) return null
  return doc.data() as Place
}

export async function getPlacesByCity(city: string, limit = 24): Promise<Place[]> {
  const snapshot = await db
    .collection('places')
    .where('city', '==', city)
    .limit(limit)
    .get()
  return snapshot.docs.map(doc => doc.data() as Place)
}

export async function getPlacesByType(placeType: string, limit = 24): Promise<Place[]> {
  const snapshot = await db
    .collection('places')
    .where('placeType', '==', placeType)
    .limit(limit)
    .get()
  return snapshot.docs.map(doc => doc.data() as Place)
}

export async function getAllPlaceSlugs(): Promise<string[]> {
  const snapshot = await db.collection('places').select('slug').get()
  return snapshot.docs.map(doc => doc.data().slug)
}
```

---

### src/app/layout.tsx

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'AllParx — Discover Parks & Outdoor Recreation Near You',
    template: '%s | AllParx',
  },
  description: 'Find parks, trails, dog parks, beaches, campgrounds and outdoor recreation spots across America.',
  metadataBase: new URL('https://allparx.com'),
  openGraph: {
    siteName: 'AllParx',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-green-700 tracking-tight">
            🌲 AllParx
          </a>
          <div className="flex gap-6 text-sm text-gray-600">
            <a href="/places/category/park" className="hover:text-green-700">Parks</a>
            <a href="/places/category/dog_park" className="hover:text-green-700">Dog Parks</a>
            <a href="/places/category/hiking_area" className="hover:text-green-700">Trails</a>
            <a href="/places/category/beach" className="hover:text-green-700">Beaches</a>
            <a href="/places/category/campground" className="hover:text-green-700">Camping</a>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-gray-100 px-6 py-10 mt-20 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} AllParx. Discover outdoor recreation across America.
        </footer>
      </body>
    </html>
  )
}
```

---

### src/app/page.tsx (Homepage)

```tsx
import { getPlacesByType } from '@/lib/firestore'
import PlaceCard from '@/components/PlaceCard'

export default async function HomePage() {
  const parks = await getPlacesByType('park', 12)
  const dogParks = await getPlacesByType('dog_park', 6)
  const trails = await getPlacesByType('hiking_area', 6)

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Hero */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Find Your Next Outdoor Adventure
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
          Parks, trails, dog parks, beaches, and campgrounds across every city in America.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {['Parks', 'Dog Parks', 'Trails', 'Beaches', 'Campgrounds', 'Disc Golf'].map(cat => (
            <a
              key={cat}
              href={`/places/category/${cat.toLowerCase().replace(' ', '_')}`}
              className="px-5 py-2 rounded-full border border-green-200 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
            >
              {cat}
            </a>
          ))}
        </div>
      </section>

      {/* Featured Parks */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Parks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {parks.map(place => (
            <PlaceCard key={place.slug} place={place} />
          ))}
        </div>
      </section>

      {/* Dog Parks */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dog Parks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dogParks.map(place => (
            <PlaceCard key={place.slug} place={place} />
          ))}
        </div>
      </section>

      {/* Trails */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Hiking Trails</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trails.map(place => (
            <PlaceCard key={place.slug} place={place} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

---

### src/components/PlaceCard.tsx

```tsx
import { Place } from '@/lib/firestore'

export default function PlaceCard({ place }: { place: Place }) {
  const typeLabel: Record<string, string> = {
    park: 'Park',
    dog_park: 'Dog Park',
    campground: 'Campground',
    hiking_area: 'Trail',
    beach: 'Beach',
    rv_park: 'RV Park',
    national_park: 'National Park',
    state_park: 'State Park',
    nature_reserve: 'Nature Reserve',
    sports_complex: 'Sports Complex',
    recreation_center: 'Recreation Center',
    picnic_ground: 'Picnic Area',
    fishing_area: 'Fishing',
  }

  return (
    <a
      href={`/places/${place.slug}`}
      className="group block rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Photo placeholder — green gradient until real photo loads */}
      <div className="h-40 bg-gradient-to-br from-green-700 to-emerald-400 flex items-end p-4">
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
          {typeLabel[place.placeType] || place.placeType}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-1">
          {place.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{place.city} · {place.address}</p>
        {place.rating && (
          <div className="flex items-center gap-1 mt-2">
            <span className="text-yellow-500 text-sm">★</span>
            <span className="text-sm font-medium text-gray-700">{place.rating}</span>
            <span className="text-sm text-gray-400">({place.reviewCount.toLocaleString()})</span>
          </div>
        )}
        <div className="flex gap-3 mt-3 text-xs text-gray-400">
          {place.allowsDogs && <span>🐕 Dogs OK</span>}
          {place.goodForChildren && <span>👶 Family</span>}
          {place.hasRestroom && <span>🚻 Restrooms</span>}
        </div>
      </div>
    </a>
  )
}
```

---

### src/app/places/[slug]/page.tsx (Individual Place Page)

This is the most important file — every backlink pointing to /places/[name] lands here.

```tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlace, getAllPlaceSlugs } from '@/lib/firestore'

type Props = { params: { slug: string } }

export async function generateStaticParams() {
  const slugs = await getAllPlaceSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const place = await getPlace(params.slug)
  if (!place) return { title: 'Place Not Found' }

  return {
    title: `${place.name} — ${place.city}`,
    description: place.description ||
      `Explore ${place.name} in ${place.city}. Find hours, directions, ratings, amenities and more on AllParx.`,
    openGraph: {
      title: `${place.name} | AllParx`,
      description: `${place.name} is a ${place.placeType.replace('_', ' ')} in ${place.city}. View details, hours, and nearby outdoor spots.`,
    },
  }
}

export default async function PlacePage({ params }: Props) {
  const place = await getPlace(params.slug)
  if (!place) notFound()

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Park',
    name: place.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: place.address,
    },
    geo: place.lat && place.lng ? {
      '@type': 'GeoCoordinates',
      latitude: place.lat,
      longitude: place.lng,
    } : undefined,
    telephone: place.phone,
    url: place.website,
    aggregateRating: place.rating ? {
      '@type': 'AggregateRating',
      ratingValue: place.rating,
      reviewCount: place.reviewCount,
    } : undefined,
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6">
          <a href="/" className="hover:text-green-700">Home</a>
          <span className="mx-2">/</span>
          <a href={`/places/category/${place.placeType}`} className="hover:text-green-700 capitalize">
            {place.placeType.replace('_', ' ')}s
          </a>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{place.name}</span>
        </nav>

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-green-800 to-emerald-500 h-64 mb-8 flex items-end p-8">
          <div>
            <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
              {place.placeType.replace('_', ' ')}
            </span>
            <h1 className="text-4xl font-bold text-white mt-1">{place.name}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {place.description && (
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">About</h2>
                <p className="text-gray-600 leading-relaxed">{place.description}</p>
              </section>
            )}

            {place.hours.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Hours</h2>
                <ul className="space-y-1">
                  {place.hours.map((h, i) => (
                    <li key={i} className="text-sm text-gray-600">{h}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Amenities */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Amenities</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Dogs Allowed', value: place.allowsDogs, icon: '🐕' },
                  { label: 'Family Friendly', value: place.goodForChildren, icon: '👨‍👩‍👧' },
                  { label: 'Restrooms', value: place.hasRestroom, icon: '🚻' },
                  { label: 'Parking Available', value: !!place.parking, icon: '🅿️' },
                ].map(({ label, value, icon }) => (
                  value !== null && (
                    <div
                      key={label}
                      className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                        value ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{value ? label : `No ${label}`}</span>
                    </div>
                  )
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="border border-gray-100 rounded-xl p-6 space-y-4">
              {place.rating && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-gray-900">{place.rating}</span>
                    <span className="text-yellow-500 text-2xl">★</span>
                  </div>
                  <p className="text-sm text-gray-400">{place.reviewCount.toLocaleString()} Google reviews</p>
                </div>
              )}

              {place.address && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Address</p>
                  <p className="text-sm text-gray-600">{place.address}</p>
                </div>
              )}

              {place.phone && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Phone</p>
                  <a href={`tel:${place.phone}`} className="text-sm text-green-700 hover:underline">
                    {place.phone}
                  </a>
                </div>
              )}

              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 px-4 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
                >
                  Visit Website
                </a>
              )}

              {place.lat && place.lng && (
                <a
                  href={`https://maps.google.com/?q=${place.lat},${place.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 px-4 border border-green-200 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors"
                >
                  Get Directions
                </a>
              )}
            </div>

            {/* AdSense Placeholder */}
            <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-300 text-sm">
              [ Ad Unit — Google AdSense ]
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
```

---

### src/app/places/category/[type]/page.tsx (Category Pages)

```tsx
import { Metadata } from 'next'
import { getPlacesByType } from '@/lib/firestore'
import PlaceCard from '@/components/PlaceCard'

type Props = { params: { type: string } }

const TYPE_LABELS: Record<string, string> = {
  park: 'Parks',
  dog_park: 'Dog Parks',
  campground: 'Campgrounds',
  hiking_area: 'Hiking Trails',
  beach: 'Beaches',
  rv_park: 'RV Parks',
  national_park: 'National Parks',
  state_park: 'State Parks',
  nature_reserve: 'Nature Reserves',
  sports_complex: 'Sports Complexes',
  recreation_center: 'Recreation Centers',
  picnic_ground: 'Picnic Areas',
  fishing_area: 'Fishing Spots',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const label = TYPE_LABELS[params.type] || params.type
  return {
    title: `${label} Near You`,
    description: `Browse ${label.toLowerCase()} across America. Find locations, hours, ratings, and directions on AllParx.`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const places = await getPlacesByType(params.type, 48)
  const label = TYPE_LABELS[params.type] || params.type

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">{label}</h1>
      <p className="text-gray-500 mb-10">
        {places.length} {label.toLowerCase()} listed across America
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {places.map(place => (
          <PlaceCard key={place.slug} place={place} />
        ))}
      </div>
    </div>
  )
}
```

---

### src/app/sitemap.ts (Auto-generates sitemap for Google)

```typescript
import { MetadataRoute } from 'next'
import { getAllPlaceSlugs } from '@/lib/firestore'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllPlaceSlugs()

  const placeUrls = slugs.map(slug => ({
    url: `https://allparx.com/places/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://allparx.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...placeUrls,
  ]
}
```

---

### src/app/robots.ts

```typescript
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://allparx.com/sitemap.xml',
  }
}
```

---

## STEP 5 — VERCEL DEPLOYMENT

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# Project → Settings → Environment Variables
# Add all 5 variables from .env.local
```

Or connect your GitHub repo to Vercel for auto-deploy on every push.

---

## STEP 6 — FIRESTORE INDEX

In Firebase Console → Firestore → Indexes, create these composite indexes:

1. Collection: places | Fields: city (ASC), createdAt (DESC)
2. Collection: places | Fields: placeType (ASC), rating (DESC)
3. Collection: places | Fields: city (ASC), placeType (ASC)

Without these, the compound queries will throw errors.

---

## EXECUTION ORDER SUMMARY

1. npm create-next-app + install deps
2. Create .env.local with API keys
3. Create src/lib/firebase-admin.ts
4. Create scripts/ingest-places.ts
5. Run: npm run ingest (let it run — will take 15-30 min for all cities)
6. While ingestion runs, build all the Next.js files above
7. npm run dev to preview locally
8. vercel deploy when ready
9. Confirm allparx.com routes correctly through Cloudflare → Vercel

---

## NOTES FOR THE LLM

- Preserve the /places/[slug] URL pattern — existing backlinks point here
- Do NOT change the slug format — it must match original allparx.com URLs
- The ingestion script is idempotent — safe to run multiple times
- Start with 5 cities first to test before running all 50
- Add `export const dynamic = 'force-static'` to place pages for full SSG
- The sitemap auto-generates from Firestore — no manual updates needed
```
