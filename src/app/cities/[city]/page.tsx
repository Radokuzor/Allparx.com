import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DEAD_URL_DESTINATION } from '@/lib/dead-url'
import PlaceGrid from '@/components/PlaceGrid'
import JsonLd from '@/components/JsonLd'
import { citySlug, getAllCities, getPlacesByCity, resolveCity } from '@/lib/firestore'
import { typeLabelPlural } from '@/lib/place-types'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

type Props = { params: Promise<{ city: string }> }

export const dynamic = 'force-static'
export const dynamicParams = true

export async function generateStaticParams() {
  const cities = await getAllCities()
  return cities.map((city) => ({ city: citySlug(city) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params
  const city = await resolveCity(slug)
  if (!city) return { title: 'City Not Found', robots: { index: false, follow: false } }

  const description = `Parks, trails, dog parks, beaches and campgrounds in ${city}. Hours, ratings, amenities and directions on ${SITE_NAME}.`
  return {
    title: `Outdoor Recreation in ${city}`,
    description,
    alternates: { canonical: `/cities/${slug}` },
    openGraph: {
      type: 'website',
      url: absoluteUrl(`/cities/${slug}`),
      title: `Outdoor Recreation in ${city} | ${SITE_NAME}`,
      description,
    },
  }
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params
  const city = await resolveCity(slug)
  if (!city) redirect(DEAD_URL_DESTINATION)

  const places = await getPlacesByCity(city)

  // Group by category so the page reads as a directory rather than one long grid.
  const byType = new Map<string, typeof places>()
  for (const place of places) {
    const bucket = byType.get(place.placeType) ?? []
    bucket.push(place)
    byType.set(place.placeType, bucket)
  }

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'ItemList',
              name: `Outdoor recreation in ${city}`,
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
                { '@type': 'ListItem', position: 2, name: 'Cities', item: absoluteUrl('/cities') },
                { '@type': 'ListItem', position: 3, name: city, item: absoluteUrl(`/cities/${slug}`) },
              ],
            },
          ],
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/cities" className="hover:text-green-700">Cities</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{city}</span>
        </nav>

        <h1 className="mb-2 text-4xl font-bold text-gray-900">Outdoor Recreation in {city}</h1>
        <p className="mb-10 text-gray-500">{places.length} places listed</p>

        {[...byType.entries()].map(([type, group]) => (
          <section key={type} className="mb-14">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-gray-800">{typeLabelPlural(type)}</h2>
              <Link
                href={`/cities/${slug}/${type}`}
                className="text-sm font-medium text-green-700 hover:underline"
              >
                {typeLabelPlural(type)} in {city} →
              </Link>
            </div>
            <PlaceGrid places={group} wide />
          </section>
        ))}
      </div>
    </>
  )
}
