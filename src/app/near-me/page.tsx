import type { Metadata } from 'next'
import NearMe from '@/components/NearMe'
import SearchBox from '@/components/SearchBox'

// The list is built in the browser from the visitor's own location, so there is
// nothing here for a crawler to index beyond this shell — keep it out of the
// index rather than publish a thin page, but let links on it be followed.
export const metadata: Metadata = {
  title: 'Outdoor Places Near You',
  description:
    'Find top-rated parks, trails, dog parks, beaches and campgrounds near your location or ZIP code.',
  robots: { index: false, follow: true },
}

export default function NearMePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Outdoor places near you</h1>
      <div className="mt-5">
        <SearchBox />
      </div>
      <NearMe />
    </div>
  )
}
