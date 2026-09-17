import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import PlaceCard from '@/components/PlaceCard'
import { googleListingUrl, mapEmbedUrl } from '@/lib/google-maps'
import { photoAtWidth, placePhoto } from '@/lib/photos'
import { getAllPlaceSlugs, getNearbyPlaces, getPlace, citySlug } from '@/lib/firestore'
import { SCHEMA_TYPE, typeLabel, typeLabelPlural } from '@/lib/place-types'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

type Props = { params: Promise<{ slug: string }> }

// Fully static: every place page is rendered at build time and served from the
// CDN. Existing allparx.com backlinks point at these URLs.
export const dynamic = 'force-static'
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await getAllPlaceSlugs()
  return slugs.map((slug) => ({ slug }))
}

function placeLocation(place: { city: string; state: string | null }): string {
  return place.state ? `${place.city}, ${place.state}` : place.city
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const place = await getPlace(slug)
  if (!place) return { title: 'Place Not Found', robots: { index: false, follow: false } }

  const where = placeLocation(place)
  const title = `${place.name} — ${where}`
  const description =
    place.description ??
    `${place.name} is a ${typeLabel(place.placeType).toLowerCase()} in ${where}. Find hours, directions, ratings, amenities and nearby outdoor spots on ${SITE_NAME}.`

  return {
    title,
    description,
    alternates: { canonical: `/places/${place.slug}` },
    openGraph: {
      type: 'website',
      url: absoluteUrl(`/places/${place.slug}`),
      title: `${place.name} | ${SITE_NAME}`,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PlacePage({ params }: Props) {
  const { slug } = await params
  const place = await getPlace(slug)
  if (!place) notFound()

  const nearby = await getNearbyPlaces(place)
  const where = placeLocation(place)
  const url = absoluteUrl(`/places/${place.slug}`)
  const hero = placePhoto(place)
  const mapEmbedSrc = mapEmbedUrl(place)
  const listingUrl = googleListingUrl(place)

  const amenities = [
    { label: 'Dogs Allowed', value: place.allowsDogs, icon: '🐕' },
    { label: 'Family Friendly', value: place.goodForChildren, icon: '👨‍👩‍👧' },
    { label: 'Restrooms', value: place.hasRestroom, icon: '🚻' },
    { label: 'Parking Available', value: place.parking ? true : null, icon: '🅿️' },
  ].filter((a) => a.value !== null)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': SCHEMA_TYPE[place.placeType] ?? 'Park',
              '@id': `${url}/#place`,
              name: place.name,
              description: place.description ?? undefined,
              url,
              sameAs: place.website ?? undefined,
              telephone: place.phone ?? undefined,
              address: place.address
                ? {
                    '@type': 'PostalAddress',
                    streetAddress: place.address,
                    addressLocality: place.city,
                    addressRegion: place.state ?? undefined,
                    addressCountry: 'US',
                  }
                : undefined,
              geo:
                place.lat !== null && place.lng !== null
                  ? { '@type': 'GeoCoordinates', latitude: place.lat, longitude: place.lng }
                  : undefined,
              openingHours: place.hours.length > 0 ? place.hours : undefined,
              isAccessibleForFree: true,
              aggregateRating:
                place.rating !== null && place.reviewCount > 0
                  ? {
                      '@type': 'AggregateRating',
                      ratingValue: place.rating,
                      reviewCount: place.reviewCount,
                      bestRating: 5,
                      worstRating: 1,
                    }
                  : undefined,
              amenityFeature: amenities.map((a) => ({
                '@type': 'LocationFeatureSpecification',
                name: a.label,
                value: a.value === true,
              })),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: typeLabelPlural(place.placeType),
                  item: absoluteUrl(`/places/category/${place.placeType}`),
                },
                { '@type': 'ListItem', position: 3, name: place.name, item: url },
              ],
            },
          ],
        }}
      />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <span className="mx-2">/</span>
          <Link href={`/places/category/${place.placeType}`} className="hover:text-green-700">
            {typeLabelPlural(place.placeType)}
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/cities/${citySlug(place.city)}`} className="hover:text-green-700">
            {place.city}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{place.name}</span>
        </nav>

        <div className="relative mb-8 flex h-64 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-green-800 to-emerald-500 p-8">
          {hero && (
            <>
              <Image
                src={photoAtWidth(hero.photo.url, 1280)}
                alt={hero.illustrative ? '' : place.name}
                fill
                priority
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
              <p className="absolute right-3 top-2 max-w-[85%] truncate text-right text-[11px] text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
                {hero.illustrative ? `Illustrative ${typeLabel(place.placeType).toLowerCase()} photo` : 'Photo'}
                {': '}
                <a href={hero.photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {hero.photo.author}
                </a>
                {' · '}
                {hero.photo.licenseUrl ? (
                  <a href={hero.photo.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline">
                    {hero.photo.license}
                  </a>
                ) : (
                  hero.photo.license
                )}
                {' · Wikimedia Commons'}
              </p>
            </>
          )}
          <div className="relative">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
              {typeLabel(place.placeType)} · {where}
            </span>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">{place.name}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-800">About</h2>
              <p className="leading-relaxed text-gray-600">
                {place.description ??
                  `${place.name} is a ${typeLabel(place.placeType).toLowerCase()} in ${where}${
                    place.address ? `, located at ${place.address}` : ''
                  }.${
                    place.rating !== null
                      ? ` It holds a ${place.rating} star rating from ${place.reviewCount.toLocaleString()} Google reviews.`
                      : ''
                  }`}
              </p>
            </section>

            {place.hours.length > 0 && (
              <section>
                <h2 className="mb-3 text-xl font-semibold text-gray-800">Hours</h2>
                <ul className="space-y-1">
                  {place.hours.map((h) => (
                    <li key={h} className="text-sm text-gray-600">{h}</li>
                  ))}
                </ul>
              </section>
            )}

            {amenities.length > 0 && (
              <section>
                <h2 className="mb-3 text-xl font-semibold text-gray-800">Amenities</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {amenities.map(({ label, value, icon }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                        value ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span aria-hidden>{icon}</span>
                      <span>{value ? label : `No ${label}`}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {mapEmbedSrc && (
              <section>
                <h2 className="mb-3 text-xl font-semibold text-gray-800">Map</h2>
                <iframe
                  title={`Map of ${place.name}`}
                  src={mapEmbedSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  className="h-80 w-full rounded-xl border border-gray-100"
                />
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <div className="space-y-4 rounded-xl border border-gray-100 p-6">
              {place.rating !== null && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-gray-900">{place.rating}</span>
                    <span className="text-2xl text-yellow-500">★</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {place.reviewCount.toLocaleString()} Google reviews
                  </p>
                  {listingUrl && (
                    <a
                      href={listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-sm text-green-700 hover:underline"
                    >
                      See photos &amp; reviews on Google →
                    </a>
                  )}
                </div>
              )}

              {place.address && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Address
                  </p>
                  <p className="text-sm text-gray-600">{place.address}</p>
                </div>
              )}

              {place.phone && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Phone
                  </p>
                  <a href={`tel:${place.phone}`} className="text-sm text-green-700 hover:underline">
                    {place.phone}
                  </a>
                </div>
              )}

              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block w-full rounded-lg bg-green-700 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-green-800"
                >
                  Visit Website
                </a>
              )}

              {place.lat !== null && place.lng !== null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}${
                    place.googlePlaceId ? `&query_place_id=${place.googlePlaceId}` : ''
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-lg border border-green-200 px-4 py-2 text-center text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                >
                  Get Directions
                </a>
              )}
            </div>
          </aside>
        </div>

        {nearby.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold text-gray-800">
              More {typeLabelPlural(place.placeType)} in {place.city}
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((p) => (
                <PlaceCard key={p.slug} place={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
