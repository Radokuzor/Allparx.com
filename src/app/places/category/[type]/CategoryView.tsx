import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import PlaceGrid from '@/components/PlaceGrid'
import RememberList from '@/components/RememberList'
import SearchBox from '@/components/SearchBox'
import Pagination from '@/components/Pagination'
import { CATEGORY_PAGE_SIZE, getPlacesByTypePage } from '@/lib/firestore'
import { typeLabelPlural } from '@/lib/place-types'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

function pagePath(type: string, page: number): string {
  return page === 1 ? `/places/category/${type}` : `/places/category/${type}/page/${page}`
}

export function categoryMetadata(type: string, page: number): Metadata {
  const label = typeLabelPlural(type)
  const description = `Browse ${label.toLowerCase()} near you. Find locations, hours, ratings, amenities and directions on ${SITE_NAME}.`
  const path = pagePath(type, page)
  const title = page === 1 ? `${label} Near You` : `${label} Near You — Page ${page}`

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: absoluteUrl(path),
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  }
}

export async function CategoryView({ type, page }: { type: string; page: number }) {
  const { items, total } = await getPlacesByTypePage(type, page, CATEGORY_PAGE_SIZE)
  const label = typeLabelPlural(type)
  const totalPages = Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE))
  const start = total === 0 ? 0 : (page - 1) * CATEGORY_PAGE_SIZE + 1
  const end = Math.min(page * CATEGORY_PAGE_SIZE, total)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'ItemList',
              name: label,
              numberOfItems: total,
              itemListElement: items.map((place, i) => ({
                '@type': 'ListItem',
                position: (page - 1) * CATEGORY_PAGE_SIZE + i + 1,
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
        <div className="mb-8 max-w-2xl">
          <SearchBox type={type} />
        </div>
        <h1 className="mb-2 text-4xl font-bold text-gray-900">{label}</h1>
        <p className="mb-10 text-gray-500">
          {total === 0
            ? `No ${label.toLowerCase()} listed on ${SITE_NAME} yet`
            : `Showing ${start}–${end} of ${total} ${label.toLowerCase()} on ${SITE_NAME}`}
        </p>
        <RememberList
          label={label}
          items={items.map((place) => ({ slug: place.slug, name: place.name }))}
        >
          <PlaceGrid places={items} wide />
        </RememberList>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath={`/places/category/${type}`}
        />
      </div>
    </>
  )
}
