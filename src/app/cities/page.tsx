import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { citySlug, getAllCities } from '@/lib/firestore'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Browse Outdoor Recreation by City',
  description: `Every city covered by ${SITE_NAME}. Find parks, trails, dog parks, beaches and campgrounds near you.`,
  alternates: { canonical: '/cities' },
}

export default async function CitiesIndexPage() {
  const cities = await getAllCities()

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Cities covered',
          numberOfItems: cities.length,
          itemListElement: cities.map((city, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: city,
            url: absoluteUrl(`/cities/${citySlug(city)}`),
          })),
        }}
      />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Browse by City</h1>
        <p className="mb-10 text-gray-500">{cities.length} cities covered</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cities.map((city) => (
            <Link
              key={city}
              href={`/cities/${citySlug(city)}`}
              className="rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-green-200 hover:text-green-700"
            >
              {city}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
