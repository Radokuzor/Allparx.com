import Link from 'next/link'
import { MapPin } from 'lucide-react'
import PlaceGrid from '@/components/PlaceGrid'
import HeroVideo from '@/components/HeroVideo'
import JsonLd from '@/components/JsonLd'
import SearchBox from '@/components/SearchBox'
import { getAllCities, getPlacesByType, citySlug } from '@/lib/firestore'
import { FEATURED_TYPES, PLACE_TYPES, typeLabelPlural } from '@/lib/place-types'
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/site'

export const revalidate = 86400

const SECTIONS = ['park', 'dog_park', 'hiking_area'] as const
const SECTION_ICON: Record<string, string> = { park: '🌳', dog_park: '🐕', hiking_area: '⛰️' }

export default async function HomePage() {
  const [sections, cities] = await Promise.all([
    Promise.all(
      SECTIONS.map(async (type) => ({ type, places: await getPlacesByType(type, 12) })),
    ),
    getAllCities(),
  ])

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${SITE_NAME} — Outdoor Recreation Directory`,
          description: SITE_DESCRIPTION,
          url: absoluteUrl('/'),
          about: PLACE_TYPES.map((type) => ({
            '@type': 'Thing',
            name: typeLabelPlural(type),
            url: absoluteUrl(`/places/category/${type}`),
          })),
        }}
      />

      <section className="relative isolate overflow-hidden rounded-b-[2rem] text-white sm:rounded-b-[2.5rem]">
        <HeroVideo />

        <div className="mx-auto flex min-h-[34rem] max-w-6xl flex-col items-center justify-center px-6 py-20 text-center lg:min-h-[40rem]">
          {cities.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-xl">
              <MapPin className="h-3.5 w-3.5 text-green-300" />
              {cities.length} cities · {PLACE_TYPES.length} outdoor categories
            </span>
          )}
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.5)] sm:text-5xl lg:text-6xl">
            Find Your Next Outdoor Adventure
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85 [text-shadow:0_1px_16px_rgba(0,0,0,0.5)] sm:text-xl">
            Parks, trails, dog parks, beaches, and campgrounds — with real hours, ratings and
            directions.
          </p>
          <div className="mx-auto mt-8 w-full max-w-xl rounded-full border border-white/25 bg-white/15 p-1.5 shadow-2xl backdrop-blur-xl">
            <SearchBox />
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {FEATURED_TYPES.map((type) => (
              <Link
                key={type}
                href={`/places/category/${type}`}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-colors hover:border-white/50 hover:bg-white/20"
              >
                {typeLabelPlural(type)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-12 pt-14">
        {sections.map(({ type, places }) => (
          <section key={type} className="mb-16">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                <span aria-hidden>{SECTION_ICON[type]}</span>
                {typeLabelPlural(type)}
              </h2>
              <Link
                href={`/places/category/${type}`}
                className="text-sm font-medium text-green-700 hover:underline"
              >
                View all →
              </Link>
            </div>
            <PlaceGrid places={places} />
          </section>
        ))}

        {cities.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-gray-800">Browse by City</h2>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={`/cities/${citySlug(city)}`}
                  className="rounded-lg border border-gray-100 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-green-200 hover:text-green-700"
                >
                  {city}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
