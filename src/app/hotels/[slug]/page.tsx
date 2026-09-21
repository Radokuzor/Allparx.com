import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ExternalLink, Info, MapPin, Phone, Star } from 'lucide-react'
import JsonLd from '@/components/JsonLd'
import HotelCard from '@/components/HotelCard'
import PhotoCredit from '@/components/PhotoCredit'
import StayEnquiryForm from '@/components/StayEnquiryForm'
import { AFFILIATION_NOTICE, HOTELS, getHotel } from '@/lib/hotels'
import { googleListingUrl, mapEmbedUrl } from '@/lib/google-maps'
import { photoAtWidth, photoCredits } from '@/lib/photos'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

type Props = { params: Promise<{ slug: string }> }

/** Static like the rest of the site; the enquiry form posts to a dynamic route. */
export const dynamic = 'force-static'

export async function generateStaticParams() {
  return HOTELS.map((hotel) => ({ slug: hotel.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const hotel = getHotel(slug)
  if (!hotel) return { title: 'Hotel Not Found', robots: { index: false, follow: false } }

  const title = `${hotel.name} — ${hotel.where}`
  const description = `${hotel.name} in ${hotel.where}, ${hotel.country}. ${hotel.tagline} Rated ${hotel.rating} on Google across ${hotel.reviewCount.toLocaleString('en-US')} reviews. Check dates and request availability on ${SITE_NAME}.`
  const image = hotel.photos[0] ? photoAtWidth(hotel.photos[0].photo.url, 1280) : null

  return {
    title,
    description,
    alternates: { canonical: `/hotels/${hotel.slug}` },
    openGraph: {
      type: 'website',
      url: absoluteUrl(`/hotels/${hotel.slug}`),
      title: `${hotel.name} | ${SITE_NAME}`,
      description,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function HotelPage({ params }: Props) {
  const { slug } = await params
  const hotel = getHotel(slug)
  if (!hotel) redirect('/')

  const url = absoluteUrl(`/hotels/${hotel.slug}`)
  const hero = hotel.photos[0]
  const gallery = hotel.photos.slice(1)
  const others = HOTELS.filter((h) => h.slug !== hotel.slug)
  const credits = photoCredits(hotel.photos.map(({ photo }) => photo))
  const mapEmbedSrc = mapEmbedUrl({ googlePlaceId: hotel.googlePlaceId, lat: hotel.lat, lng: hotel.lng })
  const listingUrl = googleListingUrl({
    googlePlaceId: hotel.googlePlaceId,
    lat: hotel.lat,
    lng: hotel.lng,
  })
  const reviewsOn = new Date(`${hotel.factsAsOf}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Hotel',
              '@id': `${url}/#hotel`,
              name: hotel.name,
              description: hotel.tagline,
              url,
              image: hotel.photos.map((p) => photoAtWidth(p.photo.url, 1280)),
              dateModified: hotel.updated,
              // The operator's own site, so the entity resolves to the hotel
              // rather than to this write-up of it.
              sameAs: hotel.website,
              telephone: hotel.phone,
              brand: { '@type': 'Brand', name: hotel.brand },
              address: { '@type': 'PostalAddress', streetAddress: hotel.address },
              geo: { '@type': 'GeoCoordinates', latitude: hotel.lat, longitude: hotel.lng },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: hotel.rating,
                reviewCount: hotel.reviewCount,
                bestRating: 5,
                worstRating: 1,
              },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Banyan Tree Hotels',
                  item: absoluteUrl('/places/banyan-tree'),
                },
                { '@type': 'ListItem', position: 3, name: hotel.name, item: url },
              ],
            },
          ],
        }}
      />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-green-700">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/places/banyan-tree" className="hover:text-green-700">
            Banyan Tree Hotels
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{hotel.name}</span>
        </nav>

        <div className="relative mb-8 flex h-64 items-end overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-500 p-8 sm:h-72">
          {hero && (
            <>
              <Image
                src={photoAtWidth(hero.photo.url, 1280)}
                alt={hotel.name}
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            </>
          )}
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
              {hotel.brand} · {hotel.where}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{hotel.name}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-800">About</h2>
              <div className="space-y-4">
                {hotel.lede.map((paragraph) => (
                  <p key={paragraph} className="leading-relaxed text-gray-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {hotel.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-3 text-xl font-semibold text-gray-800">{section.heading}</h2>
                <div className="space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed text-gray-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            {gallery.length > 0 && (
              <section>
                <h2 className="mb-3 text-xl font-semibold text-gray-800">Photos</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {gallery.map(({ photo, caption }) => (
                    <figure key={photo.sourceUrl}>
                      <a
                        href={photo.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block aspect-[3/2] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
                      >
                        <Image
                          src={photoAtWidth(photo.url, 960)}
                          alt={caption}
                          fill
                          unoptimized
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </a>
                      <figcaption className="mt-2 text-sm leading-snug text-gray-500">
                        {caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {mapEmbedSrc && (
              <section>
                <h2 className="mb-3 text-xl font-semibold text-gray-800">Where it is</h2>
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  <iframe
                    src={mapEmbedSrc}
                    title={`Map of ${hotel.name}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-72 w-full border-0"
                  />
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-800">Other stays we cover</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {others.map((other) => (
                  <HotelCard key={other.slug} hotel={other} />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{hotel.rating}</span>
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {hotel.reviewCount.toLocaleString('en-US')} Google reviews
              </p>
              {listingUrl && (
                <a
                  href={listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-green-700 hover:underline"
                >
                  Read the reviews on Google <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Google&apos;s aggregate rating, read on {reviewsOn}. {SITE_NAME} does not write or
                host reviews of its own.
              </p>

              <p className="mt-4 flex items-start gap-1.5 text-sm text-gray-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                {hotel.address}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                {hotel.phone}
              </p>
            </div>

            {hotel.goodToKnow.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-amber-800">
                  <Info className="h-4 w-4" /> Good to know
                </h3>
                <ul className="mt-3 space-y-2">
                  {hotel.goodToKnow.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-gray-600">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <StayEnquiryForm
              hotelSlug={hotel.slug}
              hotelName={hotel.name}
              website={hotel.website}
              notice={AFFILIATION_NOTICE}
            />
          </aside>
        </div>

        {/* Attribution for every picture above, in one place — the same shape
            a place page uses, so the two read alike. */}
        {credits.length > 0 && (
          <footer className="mt-12 space-y-1 border-t border-gray-100 pt-6 text-xs leading-relaxed text-gray-400">
            {credits.map((photo) => (
              <p key={`${photo.author}|${photo.license}`}>
                <PhotoCredit photo={photo} />
              </p>
            ))}
          </footer>
        )}
      </div>
    </>
  )
}
