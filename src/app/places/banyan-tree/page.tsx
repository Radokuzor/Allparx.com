import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, TreePine } from 'lucide-react'
import JsonLd from '@/components/JsonLd'
import HotelCard from '@/components/HotelCard'
import PhotoCredit from '@/components/PhotoCredit'
import { AFFILIATION_NOTICE, HOTELS, hotelsByBrand } from '@/lib/hotels'
import { photoAtWidth } from '@/lib/photos'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

/**
 * /places/banyan-tree — the Banyan Tree hotel hub.
 *
 * This URL used to hold the Kawela Bay banyan, which now lives at
 * /places/banyan-tree-kawela-bay-oahu (see src/lib/slug-alias.ts). The
 * searches that reach it are overwhelmingly commercial — "banyan tree banyan"
 * alone is 22.2K/mo and Semrush scores it Commercial — because Banyan Tree is
 * a hotel brand as well as a tree.
 *
 * Both readings are served here, and the tree is linked in the first screen
 * rather than buried: somebody who came for the tree should be one click from
 * it, not funnelled into a hotel enquiry. This page is an independent
 * write-up; `AFFILIATION_NOTICE` runs on it and on every hotel page.
 */
export const dynamic = 'force-static'

const TREE_HREF = '/places/banyan-tree-kawela-bay-oahu'

const title = 'Banyan Tree Hotels & Resorts — an independent guide'
const description =
  'An independent guide to Banyan Tree hotels and resorts — Phuket, Bangkok and Bintan — plus The Ritz-Carlton O‘ahu, Turtle Bay, the resort beside the Kawela Bay banyan tree. Google ratings, photos and stay enquiries.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/places/banyan-tree' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/places/banyan-tree'),
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [photoAtWidth(HOTELS[0].photos[0].photo.url, 1280)],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [photoAtWidth(HOTELS[0].photos[0].photo.url, 1280)],
  },
}

export default function BanyanTreeHotelsPage() {
  const url = absoluteUrl('/places/banyan-tree')
  const banyanTreeHotels = hotelsByBrand('Banyan Tree')
  const otherHotels = HOTELS.filter((hotel) => hotel.brand !== 'Banyan Tree')
  const hero = HOTELS[0].photos[0]

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              '@id': `${url}/#page`,
              name: title,
              description,
              url,
              // Named, but not claimed: this page is about the brand and says
              // so, and every hotel entity points at the operator's own site.
              about: { '@type': 'Brand', name: 'Banyan Tree' },
              mainEntity: {
                '@type': 'ItemList',
                itemListElement: HOTELS.map((hotel, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: hotel.name,
                  url: absoluteUrl(`/hotels/${hotel.slug}`),
                })),
              },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
                { '@type': 'ListItem', position: 2, name: 'Banyan Tree Hotels', item: url },
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
          <span className="text-gray-600">Banyan Tree Hotels</span>
        </nav>

        <div className="relative mb-4 flex h-64 items-end overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-500 p-8 sm:h-72">
          <Image
            src={photoAtWidth(hero.photo.url, 1280)}
            alt="Banyan Tree Phuket, the brand's first resort"
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
              Independent guide
            </span>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Banyan Tree Hotels &amp; Resorts
            </h1>
          </div>
        </div>

        <p className="mb-8 text-right text-xs text-gray-400">
          <PhotoCredit photo={hero.photo} />
        </p>

        {/* Ahead of everything else: half the traffic here wants the tree. */}
        <Link
          href={TREE_HREF}
          className="group mb-8 flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50/50 p-5 transition-colors hover:border-green-300 hover:bg-green-50"
        >
          <TreePine className="h-8 w-8 shrink-0 text-green-700" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">Looking for the actual banyan tree?</p>
            <p className="mt-0.5 text-sm leading-relaxed text-gray-600">
              The Kawela Bay banyan on O‘ahu&apos;s North Shore — the <em>Lost</em> filming site
              near Kahuku — has moved to its own page, with directions and photos.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-green-700 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <div className="space-y-4">
          <p className="leading-relaxed text-gray-600">
            Banyan Tree is a Singaporean hospitality group founded in 1994, when Ho Kwon Ping and
            Claire Chiang opened their first resort on a rehabilitated tin mine at Bang Tao Bay in
            Phuket. It has since grown to more than 70 hotels and resorts across over 20 countries,
            and the flagship Banyan Tree brand now sits alongside Angsana, Cassia, Dhawa, Garrya and
            several others under Banyan Group.
          </p>
          <p className="leading-relaxed text-gray-600">
            The format that made the name is the private pool villa: a walled garden, a pool nobody
            else can see into, and a resort laid out horizontally around water rather than stacked
            into a tower. Not every property follows it — Bangkok is a high-rise on Sathorn Road —
            but it is what the brand is known for, and it is what the resorts below are built around.
          </p>
          <p className="leading-relaxed text-gray-600">
            Below are the properties we have written up, with Google&apos;s ratings, licensed
            photographs and a form to send us your dates. We are not the hotels and we do not take
            bookings; every page links straight to the operator&apos;s own site.
          </p>
        </div>

        <section className="mt-10">
          <h2 className="mb-1 text-xl font-semibold text-gray-800">Banyan Tree resorts</h2>
          <p className="mb-4 text-sm text-gray-400">
            Properties operated under the Banyan Tree brand.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {banyanTreeHotels.map((hotel) => (
              <HotelCard key={hotel.slug} hotel={hotel} />
            ))}
          </div>
        </section>

        {otherHotels.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-1 text-xl font-semibold text-gray-800">
              Staying near the banyan tree
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Not a Banyan Tree property — this is the resort a mile from the Kawela Bay banyan, on
              O‘ahu&apos;s North Shore.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {otherHotels.map((hotel) => (
                <HotelCard key={hotel.slug} hotel={hotel} />
              ))}
            </div>
          </section>
        )}

        <p className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-xs leading-relaxed text-gray-500">
          {AFFILIATION_NOTICE}
        </p>
      </div>
    </>
  )
}
