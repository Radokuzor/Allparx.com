'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import SearchBox from './SearchBox'
import { loadSearchIndex, rankPlaces, type IndexedEntry } from '@/lib/search-index'
import { typeLabel } from '@/lib/place-types'

const LIMIT = 60

export default function SearchResults() {
  const query = (useSearchParams().get('q') ?? '').trim()
  const [index, setIndex] = useState<IndexedEntry[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    loadSearchIndex()
      .then((loaded) => active && setIndex(loaded))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [])

  // Same scorer the suggestion dropdown uses, so the ordering a visitor saw
  // while typing is the ordering they land on.
  const matches = useMemo(
    () => (index ? rankPlaces(index, query, LIMIT) : []),
    [index, query],
  )

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Search</h1>
      <div className="mt-6">
        <SearchBox defaultValue={query} autoFocus={query.length === 0} />
      </div>

      {query.length === 0 ? (
        <p className="mt-8 text-gray-500">Type a place, city or category to get started.</p>
      ) : failed ? (
        <p className="mt-8 text-gray-500">
          Search is unavailable right now. Try{' '}
          <Link href="/places" className="text-green-700 hover:underline">
            browsing by category
          </Link>{' '}
          instead.
        </p>
      ) : index === null ? (
        <p className="mt-8 text-gray-400">Searching…</p>
      ) : matches.length === 0 ? (
        <p className="mt-8 text-gray-500">
          No matches for <span className="font-medium text-gray-700">{query}</span>. Try a broader
          term, like a city name or a category.
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-gray-400">
            {matches.length === LIMIT ? `Top ${LIMIT} matches` : `${matches.length} matches`} for{' '}
            <span className="font-medium text-gray-600">{query}</span>
          </p>
          <ul className="mt-4 divide-y divide-gray-100">
            {matches.map((entry) => (
              <li key={entry.s}>
                <Link
                  href={`/places/${entry.s}`}
                  className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:text-green-700"
                >
                  <span>
                    <span className="font-medium text-gray-900">{entry.n}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      {typeLabel(entry.t)} · {entry.c}
                      {entry.a ? `, ${entry.a}` : ''}
                    </span>
                  </span>
                  {entry.r !== null && (
                    <span className="flex shrink-0 items-center gap-1 text-sm text-gray-500">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                      {entry.r}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
