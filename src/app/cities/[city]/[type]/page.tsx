import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import PlaceGrid from '@/components/PlaceGrid'
import JsonLd from '@/components/JsonLd'
import { citySlug, getAllPlaceRefs, getPlacesByCityAndType, resolveCity } from '@/lib/firestore'
import { isKnownType, typeLabelPlural } from '@/lib/place-types'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

type Props = { params: Promise<{ city: string; type: string }> }

export const dynamic = 'force-static'
// True (like the city page) so a combo added by a later ingestion run —
// a new city, or a city's first place of a given type — renders on request
// instead of waiting for a full rebuild.
export const dynamicParams = true

// Only generate combos that actually have places, so e.g. a city with no
// marinas never gets a page for it at build time.
export async function generateStaticParams() {
  const refs = await getAllPlaceRefs()
  const seen = new Set<string>()
  const params: { city: string; type: string }[] = []
  for (const ref of refs) {
    const city = citySlug(ref.city)
    const key = `${city}::${ref.placeType}`
    if (seen.has(key)) continue
    seen.add(key)
    params.push({ city, type: ref.placeType })
  }
  return params
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug, type } = await params
  const city = await resolveCity(slug)
  if (!city || !isKnownType(type)) return { title: 'Not Found', robots: { index: false, follow: false } }

  const label = typeLabelPlural(type)
  const description = `${label} in ${city}. Hours, ratings, amenities and directions on ${SITE_NAME}.`
  return {
    title: `${label} in ${city}`,
    description,
    alternates: { canonical: `/cities/${slug}/${type}` },
    openGraph: {
      type: 'website',
      url: absoluteUrl(`/cities/${slug}/${type}`),
      title: `${label} in ${city} | ${SITE_NAME}`,
      description,
    },
  }
}

export default async function CityTypePage({ params }: Props) {
  const { city: slug, type } = await params
  const city = await resolveCity(slug)
  if (!city || !isKnownType(type)) redirect('/')

  const places = await getPlacesByCityAndType(city, type)
  if (places.length === 0) redirect('/')
  const label = typeLabelPlural(type)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'ItemList',
              name: `${label} in ${city}`,
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
                {
                  '@type': 'ListItem',
                  position: 4,
                  name: label,
                  item: absoluteUrl(`/cities/${slug}/${type}`),
                },
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
          <Link href={`/cities/${slug}`} className="hover:text-green-700">{city}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{label}</span>
        </nav>

        <h1 className="mb-2 text-4xl font-bold text-gray-900">
          {label} in {city}
        </h1>
        <p className="mb-10 text-gray-500">
          {places.length} {label.toLowerCase()} listed on {SITE_NAME}
        </p>

        <PlaceGrid places={places} wide />
      </div>
    </>
  )
}
