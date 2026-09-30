import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { getGuides } from '@/lib/guides-server'
import type { Guide } from '@/lib/guides'
import { SITE_NAME, absoluteUrl } from '@/lib/site'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Outdoor Guides by State',
  description: `Ranked guides to the best parks, trails, campgrounds, beaches and dog-friendly spots in every state ${SITE_NAME} covers.`,
  alternates: { canonical: '/guides' },
}

export default async function GuidesIndexPage() {
  const guides = await getGuides()
  const byState = new Map<string, Guide[]>()
  for (const guide of guides) {
    const group = byState.get(guide.stateName)
    if (group) group.push(guide)
    else byState.set(guide.stateName, [guide])
  }
  const states = [...byState.keys()].sort()

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Outdoor guides by state',
          numberOfItems: guides.length,
          itemListElement: guides.map((guide, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: guide.title,
            url: absoluteUrl(`/guides/${guide.slug}`),
          })),
        }}
      />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">Outdoor Guides</h1>
        <p className="mb-10 text-gray-500">
          {guides.length} ranked guides across {states.length} states
        </p>
        <div className="space-y-10">
          {states.map((state) => (
            <section key={state}>
              <h2 className="mb-3 text-xl font-semibold text-gray-800">{state}</h2>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byState.get(state)!.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      href={`/guides/${guide.slug}`}
                      className="block rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-green-200 hover:text-green-700"
                    >
                      {guide.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
