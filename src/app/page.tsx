import Link from 'next/link'
import PlaceGrid from '@/components/PlaceGrid'
import JsonLd from '@/components/JsonLd'
import { getAllCities, getPlacesByType, citySlug } from '@/lib/firestore'
import { FEATURED_TYPES, PLACE_TYPES, typeLabelPlural } from '@/lib/place-types'
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/site'

export const revalidate = 86400

const SECTIONS = ['park', 'dog_park', 'hiking_area'] as const

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

      <div className="mx-auto max-w-6xl px-6 py-12">
        <section className="py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Find Your Next Outdoor Adventure
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 sm:text-xl">
            Parks, trails, dog parks, beaches, and campgrounds across every city in America.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {FEATURED_TYPES.map((type) => (
              <Link
                key={type}
                href={`/places/category/${type}`}
                className="rounded-full border border-green-200 px-5 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
              >
                {typeLabelPlural(type)}
              </Link>
            ))}
          </div>
        </section>

        {sections.map(({ type, places }) => (
          <section key={type} className="mb-16">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-gray-800">{typeLabelPlural(type)}</h2>
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
