import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronDown, Star } from 'lucide-react'
import JsonLd from '@/components/JsonLd'
import PhotoCredit from '@/components/PhotoCredit'
import { DEAD_URL_DESTINATION } from '@/lib/dead-url'
import { getGuide, getGuides } from '@/lib/guides-server'
import { relatedGuides } from '@/lib/guides'
import { photoAtWidth, photoCredits, placePhoto } from '@/lib/photos'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-static'
// A guide the data newly supports after an ingestion run renders on request.
export const dynamicParams = true

export async function generateStaticParams() {
  return (await getGuides()).map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const guide = await getGuide(slug)
  if (!guide) return { title: 'Not Found', robots: { index: false, follow: false } }

  // Only a real photo of the top pick: a category stand-in would misrepresent it.
  const hero = placePhoto(guide.entries[0].place)
  const image = hero && !hero.illustrative ? photoAtWidth(hero.photo.url, 1280) : null
  const title = `The ${guide.entries.length} ${guide.title}`
  return {
    title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      type: 'article',
      url: absoluteUrl(`/guides/${guide.slug}`),
      title: `${title} | ${SITE_NAME}`,
      description: guide.description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const guide = await getGuide(slug)
  if (!guide) redirect(DEAD_URL_DESTINATION)

  const url = absoluteUrl(`/guides/${guide.slug}`)
  const related = relatedGuides(await getGuides(), guide)
  // Category stand-ins are credited in the category data; only real place photos need a line here.
  const credits = photoCredits(
    guide.entries.flatMap(({ place }) => {
      const image = placePhoto(place)
      return image && !image.illustrative ? [image.photo] : []
    }),
  )

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'ItemList',
              '@id': `${url}/#list`,
              name: guide.title,
              numberOfItems: guide.entries.length,
              itemListOrder: 'https://schema.org/ItemListOrderDescending',
              itemListElement: guide.entries.map(({ place }, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: absoluteUrl(`/places/${place.slug}`),
                name: place.name,
              })),
            },
            {
              '@type': 'FAQPage',
              '@id': `${url}/#faq`,
              mainEntity: guide.faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: { '@type': 'Answer', text: faq.answer },
              })),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
                { '@type': 'ListItem', position: 2, name: 'Guides', item: absoluteUrl('/guides') },
                { '@type': 'ListItem', position: 3, name: guide.title, item: url },
              ],
            },
          ],
        }}
      />

      <article className="mx-auto max-w-4xl px-6 py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-green-700">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/guides" className="hover:text-green-700">Guides</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{guide.area}</span>
        </nav>

        <h1 className="mb-6 text-4xl font-bold text-gray-900">
          The {guide.entries.length} {guide.title}
        </h1>
        <div className="mb-12 space-y-4">
          {guide.intro.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-gray-600">{paragraph}</p>
          ))}
        </div>

        <ol className="space-y-10">
          {guide.entries.map(({ place, blurb }, i) => {
            const image = placePhoto(place)
            return (
              <li key={place.slug} className="grid grid-cols-1 gap-5 sm:grid-cols-[14rem_1fr]">
                <Link
                  href={`/places/${place.slug}`}
                  className="relative block h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 to-emerald-400 sm:h-36"
                >
                  {image && (
                    // Commons and Flickr already serve sized renditions, so skip Vercel's optimizer.
                    <Image
                      src={photoAtWidth(image.photo.url, 500)}
                      alt={image.illustrative ? '' : place.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                </Link>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    <span className="mr-2 text-green-700">{i + 1}.</span>
                    <Link href={`/places/${place.slug}`} className="hover:text-green-700">
                      {place.name}
                    </Link>
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" aria-hidden />
                    {place.rating} · {place.reviewCount.toLocaleString()} reviews · {place.city}
                  </p>
                  <p className="mt-2 leading-relaxed text-gray-600">{blurb}</p>
                </div>
              </li>
            )
          })}
        </ol>

        {/* <details> keeps this interactive without shipping a client component. */}
        <section className="mt-16">
          <h2 className="mb-3 text-xl font-semibold text-gray-800">Common questions</h2>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
            {guide.faqs.map((faq) => (
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

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">More guides</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {related.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="block rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-green-200 hover:text-green-700"
                  >
                    {g.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 border-t border-gray-100 pt-6 text-sm text-gray-400">
          Rankings come from Google ratings and review counts, and refresh whenever the {SITE_NAME} directory is
          updated. Conditions and hours change, so check a place&apos;s page before you travel.
        </p>

        {credits.length > 0 && (
          <footer className="mt-8 space-y-1 text-xs leading-relaxed text-gray-400">
            {credits.map((photo) => (
              <p key={`${photo.author}|${photo.license}`}>
                <PhotoCredit photo={photo} />
              </p>
            ))}
          </footer>
        )}
      </article>
    </>
  )
}
