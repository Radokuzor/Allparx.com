import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { PLACE_TYPES, typeLabelPlural } from '@/lib/place-types'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'All Outdoor Categories',
  description: `Every category of outdoor recreation on ${SITE_NAME} — parks, dog parks, hiking trails, beaches, campgrounds, gardens, marinas and more.`,
  alternates: { canonical: '/places' },
}

export default function PlacesIndexPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Outdoor recreation categories',
          itemListElement: PLACE_TYPES.map((type, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: typeLabelPlural(type),
            url: absoluteUrl(`/places/category/${type}`),
          })),
        }}
      />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">All Categories</h1>
        <p className="mb-10 text-gray-500">
          {PLACE_TYPES.length} kinds of outdoor recreation, indexed across every city we cover.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLACE_TYPES.map((type) => (
            <Link
              key={type}
              href={`/places/category/${type}`}
              className="rounded-xl border border-gray-100 p-5 font-medium text-gray-800 transition-all hover:border-green-200 hover:text-green-700 hover:shadow-sm"
            >
              {typeLabelPlural(type)}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
