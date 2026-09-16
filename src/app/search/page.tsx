import type { Metadata } from 'next'
import { Suspense } from 'react'
import SearchResults from '@/components/SearchResults'

// Internal search results are thin, duplicative pages — follow the links out,
// but keep them out of the index. The sitewide SearchAction in the root layout
// points here, so the route itself has to exist.
export const metadata: Metadata = {
  title: 'Search',
  description: 'Search parks, trails, dog parks, beaches and campgrounds across the United States.',
  robots: { index: false, follow: true },
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-12 text-gray-400">Loading…</div>}>
      <SearchResults />
    </Suspense>
  )
}
