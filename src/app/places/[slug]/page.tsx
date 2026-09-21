import { cache } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle,
  Baby,
  Backpack,
  Bath,
  ChevronDown,
  Clock,
  Compass,
  Dog,
  ExternalLink,
  HelpCircle,
  Link2,
  Map as MapIcon,
  Navigation,
  ParkingCircle,
  PawPrint,
  Phone,
  Star,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import JsonLd from '@/components/JsonLd'
import PhotoCredit from '@/components/PhotoCredit'
import PlaceCard from '@/components/PlaceCard'
import PlaceSaveActions from '@/components/PlaceSaveActions'
import PlaceStepper from '@/components/PlaceStepper'
import { googleListingUrl, mapEmbedUrl } from '@/lib/google-maps'
import { photoAtWidth, photoCredits, placePhoto } from '@/lib/photos'
import {
  citySlug,
  findPlacesByBaseName,
  getAllPlaceSlugs,
  getPlace,
  getPlacesByCityAndType,
} from '@/lib/firestore'
import PlaceDisambiguation from '@/components/PlaceDisambiguation'
import { baseSlug, titleFromSlug } from '@/lib/legacy-slug'
import {
  considerations,
  faqs,
  highlights,
  intro,
  visitPlan,
  type Insight,
} from '@/lib/place-content'
import { getEditorial } from '@/lib/place-editorial'
import { SCHEMA_TYPE, isKnownType, typeLabel, typeLabelPlural } from '@/lib/place-types'
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

/** Insight icon keys → components, so `place-content.ts` stays free of JSX imports. */
const INSIGHT_ICON: Record<string, LucideIcon> = {
  star: Star,
  compass: Compass,
  trophy: Trophy,
  users: Users,
  clock: Clock,
  dog: Dog,
  baby: Baby,
  bath: Bath,
  parking: ParkingCircle,
  map: MapIcon,
  link: Link2,
  alert: AlertTriangle,
  help: HelpCircle,
  phone: Phone,
}

/**
 * Formatted in UTC so the static build and the browser can never disagree —
 * a locale-dependent date here would hydrate differently by timezone.
 */
function reviewedOn(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function InsightList({ items, tone }: { items: Insight[]; tone: 'pro' | 'con' }) {
  const accent = tone === 'pro' ? 'text-green-600' : 'text-amber-600'
  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const Icon = INSIGHT_ICON[item.icon] ?? Compass
        return (
          <li key={item.title} className="flex gap-3">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${accent}`} aria-hidden />
            <div>
              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{item.body}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Both generateMetadata and the page itself need the candidate list for a
 * legacy slug. React's cache dedupes them into one Firestore query per render.
 */
const candidatesFor = cache((slug: string) => findPlacesByBaseName(baseSlug(slug)))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const place = await getPlace(slug)

  if (!place) {
    const candidates = await candidatesFor(slug)
    if (candidates.length === 0) {
      return { title: 'Place Not Found', robots: { index: false, follow: false } }
    }
    const title = titleFromSlug(slug)
    return {
      title: `${title} — ${candidates.length} places`,
      description: `${candidates.length} places in the ${SITE_NAME} directory are called ${title}. Compare them by location, rating and amenities to find the one you want.`,
      alternates: { canonical: `/places/${slug}` },
    }
  }

  const where = placeLocation(place)
  const editorial = getEditorial(place.slug)
  const name = editorial?.displayName ?? place.name
  const title = `${name} — ${where}`
  // Only a photo of the place itself: a category stand-in in a share card
  // reads as a picture of this place, which it is not.
  const social = placePhoto(place)
  const image = social && !social.illustrative ? photoAtWidth(social.photo.url, 1280) : null
  const description =
    editorial?.metaDescription ??
    place.description ??
    `${name} is a ${typeLabel(place.placeType).toLowerCase()} in ${where}. Find hours, directions, ratings, amenities and nearby outdoor spots on ${SITE_NAME}.`

  return {
    title,
    description,
    alternates: { canonical: `/places/${place.slug}` },
    openGraph: {
      type: 'website',
      url: absoluteUrl(`/places/${place.slug}`),
      title: `${name} | ${SITE_NAME}`,
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

export default async function PlacePage({ params }: Props) {
  const { slug } = await params
  const place = await getPlace(slug)

  // A legacy URL with no document behind it may still name places we hold —
  // list them rather than 404, so inbound search traffic lands somewhere real.
  if (!place) {
    const candidates = await candidatesFor(slug)
    if (candidates.length > 0) {
      return <PlaceDisambiguation title={titleFromSlug(slug)} places={candidates} />
    }
    notFound()
  }

  // One query serves both the editorial context (how this place ranks among
  // its neighbours) and the "more in this city" grid at the foot of the page.
  const sameKind = await getPlacesByCityAndType(place.city, place.placeType)
  const peers = sameKind.filter((p) => p.slug !== place.slug)
  const nearby = peers.slice(0, 6)
  const context = { peers }
  // Hand-written copy wins over the generated intro where it exists, and its
  // questions lead the FAQ — they answer what the visitor actually searched.
  // Everything else on the page still comes from the listing data.
  const editorial = getEditorial(place.slug)
  // Google's name for a place can be too generic to stand alone in a search
  // result; the editorial may replace it. See PlaceEditorial.displayName.
  const name = editorial?.displayName ?? place.name
  // placePhoto() already promotes photos[0] to the hero, so the gallery is the
  // remainder — otherwise the same picture would open the page twice.
  const gallery = editorial?.photos?.slice(1) ?? []
  const paragraphs = editorial?.lede ?? intro(place, context)
  const pros = highlights(place, context)
  const cons = considerations(place, context)
  const plan = visitPlan(place)
  const questions = [...(editorial?.faqs ?? []), ...faqs(place, context)]

  // A legacy restore keeps Google's primary type when it isn't one of ours, and
  // /places/category/<type> only renders PLACE_TYPES — so for those the
  // breadcrumb points at the all-categories index instead of a guaranteed 404.
  const onBrand = isKnownType(place.placeType)
  const categoryHref = onBrand ? `/places/category/${place.placeType}` : '/places'
  const categoryName = onBrand ? typeLabelPlural(place.placeType) : 'All Places'

  const where = placeLocation(place)
  const url = absoluteUrl(`/places/${place.slug}`)
  const hero = placePhoto(place)
  const credits = photoCredits([
    ...(hero && !hero.illustrative ? [hero.photo] : []),
    ...gallery.map(({ photo }) => photo),
  ])
  const mapEmbedSrc = mapEmbedUrl(place)
  const listingUrl = googleListingUrl(place)

  const amenities = [
    { label: 'Dogs Allowed', value: place.allowsDogs, Icon: PawPrint },
    { label: 'Family Friendly', value: place.goodForChildren, Icon: Baby },
    { label: 'Restrooms', value: place.hasRestroom, Icon: Bath },
    { label: 'Parking Available', value: place.parking ? true : null, Icon: ParkingCircle },
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
              name,
              description: editorial?.metaDescription ?? place.description ?? undefined,
              // A category stand-in would be a false claim about this place.
              image:
                hero && !hero.illustrative
                  ? (editorial?.photos ?? [{ photo: hero.photo }]).map((p) =>
                      photoAtWidth(p.photo.url, 1280),
                    )
                  : undefined,
              url,
              dateModified: editorial?.updated,
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
                  name: categoryName,
                  item: absoluteUrl(categoryHref),
                },
                { '@type': 'ListItem', position: 3, name, item: url },
              ],
            },
            // Mirrors the visible FAQ exactly — the answers come from the same
            // helper, so the markup can never drift from the rendered page.
            {
              '@type': 'FAQPage',
              '@id': `${url}/#faq`,
              mainEntity: questions.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: { '@type': 'Answer', text: faq.answer },
              })),
            },
          ],
        }}
      />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <span className="mx-2">/</span>
          <Link href={categoryHref} className="hover:text-green-700">
            {categoryName}
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/cities/${citySlug(place.city)}`} className="hover:text-green-700">
            {place.city}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{name}</span>
        </nav>

        <div className="relative mb-8 flex h-64 items-end overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-500 p-8 sm:h-72">
          {hero && (
            <>
              <Image
                src={photoAtWidth(hero.photo.url, 1280)}
                alt={hero.illustrative ? '' : name}
                fill
                priority
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            </>
          )}
          <PlaceStepper
            slug={place.slug}
            fallback={{
              label: `${typeLabelPlural(place.placeType)} in ${place.city}`,
              items: sameKind.map((p) => ({ slug: p.slug, name: p.name })),
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
              {typeLabel(place.placeType)} · {where}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{name}</h1>
            <PlaceSaveActions slug={place.slug} name={name} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-800">About</h2>
              <div className="space-y-4">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph} className="leading-relaxed text-gray-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {editorial?.sections.map((section) => (
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
                      <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                        {/* Commons already serves sized renditions, so skip Vercel's optimizer. */}
                        <Image
                          src={photoAtWidth(photo.url, 960)}
                          alt={caption}
                          fill
                          unoptimized
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <figcaption className="mt-2 text-sm leading-snug text-gray-500">
                        {caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {(pros.length > 0 || cons.length > 0) && (
              <section>
                <h2 className="mb-1 text-xl font-semibold text-gray-800">The quick take</h2>
                <p className="mb-4 text-sm text-gray-400">
                  Drawn from this listing&apos;s ratings, amenities, hours and how it stacks up
                  against other {typeLabelPlural(place.placeType).toLowerCase()} in {place.city}.
                </p>
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    pros.length > 0 && cons.length > 0 ? 'sm:grid-cols-2' : ''
                  }`}
                >
                  {pros.length > 0 && (
                    <div className="rounded-2xl border border-green-100 bg-green-50/40 p-5">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-green-800">
                        <ThumbsUp className="h-4 w-4" aria-hidden />
                        What works
                      </h3>
                      <InsightList items={pros} tone="pro" />
                    </div>
                  )}
                  {cons.length > 0 && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-800">
                        <ThumbsDown className="h-4 w-4" aria-hidden />
                        Worth knowing first
                      </h3>
                      <InsightList items={cons} tone="con" />
                    </div>
                  )}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-1 text-xl font-semibold text-gray-800">Planning a visit</h2>
              <p className="mb-4 text-sm text-gray-400">
                General guidance for {typeLabelPlural(place.placeType).toLowerCase()}, adjusted for
                what this listing records.
              </p>
              <div className="space-y-5 rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex gap-3">
                  <Compass className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">What to expect</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{plan.expect}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      A good fit for {plan.suits}.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Sun className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">When to go</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{plan.timing}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Backpack className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">What to bring</p>
                    <ul className="mt-1.5 flex flex-wrap gap-2">
                      {plan.bring.map((item) => (
                        <li
                          key={item}
                          className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-600"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
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
                  {amenities.map(({ label, value, Icon }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2.5 rounded-xl p-3 text-sm ${
                        value ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
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
                  title={`Map of ${name}`}
                  src={mapEmbedSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  className="h-80 w-full rounded-2xl border border-gray-100 shadow-sm"
                />
              </section>
            )}

            {/* <details> keeps this interactive without shipping a client component. */}
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-800">
                Common questions about {name}
              </h2>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                {questions.map((faq) => (
                  <details key={faq.question} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-medium text-gray-800 hover:bg-gray-50">
                      {faq.question}
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <p className="px-4 pb-4 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>

            {editorial && (
              <section className="border-t border-gray-100 pt-6 text-sm text-gray-400">
                <p>
                  Written and reviewed by the AllParx team. Last reviewed{' '}
                  <time dateTime={editorial.updated}>{reviewedOn(editorial.updated)}</time>.
                  Ratings and hours come from Google.
                </p>
                {editorial.sources && editorial.sources.length > 0 && (
                  <p className="mt-2">
                    Sources consulted: {editorial.sources.map((source) => source.label).join(', ')}.
                  </p>
                )}
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-4 rounded-2xl border border-gray-100 p-6 shadow-sm">
              {place.rating !== null && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-gray-900">{place.rating}</span>
                    <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                  </div>
                  <p className="text-sm text-gray-400">
                    {place.reviewCount.toLocaleString()} Google reviews
                  </p>
                  {listingUrl && (
                    <a
                      href={listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm text-green-700 hover:underline"
                    >
                      See photos &amp; reviews on Google
                      <ExternalLink className="h-3.5 w-3.5" />
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
                  <a
                    href={`tel:${place.phone}`}
                    className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {place.phone}
                  </a>
                </div>
              )}

              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-green-800"
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
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 px-4 py-2.5 text-center text-sm font-semibold text-green-700 transition-colors hover:bg-green-50"
                >
                  <Navigation className="h-4 w-4" />
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

        {/* Attribution for every picture above, in one place. Plain text: the
            site does not link visitors off to other domains. */}
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

