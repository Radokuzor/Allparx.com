import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PlaceGrid from '@/components/PlaceGrid'
import JsonLd from '@/components/JsonLd'
import { getPlacesByType } from '@/lib/firestore'
import { PLACE_TYPES, isKnownType, typeLabelPlural } from '@/lib/place-types'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

type Props = { params: Promise<{ type: string }> }

export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  return PLACE_TYPES.map((type) => ({ type }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params
  if (!isKnownType(type)) return { title: 'Not Found', robots: { index: false, follow: false } }

  const label = typeLabelPlural(type)
  const description = `Browse ${label.toLowerCase()} across America. Find locations, hours, ratings, amenities and directions on ${SITE_NAME}.`

  return {
    title: `${label} Near You`,
    description,
    alternates: { canonical: `/places/category/${type}` },
    openGraph: {
      type: 'website',
      url: absoluteUrl(`/places/category/${type}`),
      title: `${label} Near You | ${SITE_NAME}`,
      description,
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { type } = await params
  if (!isKnownType(type)) notFound()

  const places = await getPlacesByType(type, 48)
  const label = typeLabelPlural(type)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'ItemList',
              name: label,
              numberOfItems: places.length,
              itemListElement: places.map((place, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: absoluteUrl(`/places/${place.slug}`),
                name: place.name,
              })),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
                { '@type': 'ListItem', position: 2, name: 'Categories', item: absoluteUrl('/places') },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: label,
                  item: absoluteUrl(`/places/category/${type}`),
                },
              ],
            },
          ],
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">{label}</h1>
        <p className="mb-10 text-gray-500">
          {places.length} {label.toLowerCase()} listed across America
        </p>
        <PlaceGrid places={places} wide />
      </div>
    </>
  )
}
