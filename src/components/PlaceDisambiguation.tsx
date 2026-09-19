import Link from 'next/link'
import { Search } from 'lucide-react'
import NearestFirst from '@/components/NearestFirst'
import type { Place } from '@/lib/types'

/**
 * Shown when a legacy URL names a place that several entries share — for
 * example `/places/lincoln-park-33`, where the `-33` proves the old site had
 * 33 places called "Lincoln Park" but not which one this URL meant.
 *
 * This is a real page, not an error: it returns 200, is indexable, and lists
 * every candidate. Picking one at random would publish a wrong address under
 * a URL that already ranks, which is worse than asking.
 */
export default function PlaceDisambiguation({
  title,
  places,
}: {
  title: string
  places: Place[]
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-widest text-green-700">
        {places.length} places share this name
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Which {title} are you looking for?
      </h1>
      <p className="mt-3 max-w-2xl text-gray-500">
        More than one place in our directory is called &ldquo;{title}&rdquo;. Pick the one you
        meant — the closest to you is listed first.
      </p>

      <div className="mt-8">
        <NearestFirst places={places} />
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-8">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-800"
        >
          <Search className="h-4 w-4" />
          Search all places
        </Link>
        <Link
          href="/cities"
          className="rounded-lg border border-green-200 px-5 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          Browse by city
        </Link>
      </div>
    </div>
  )
}
