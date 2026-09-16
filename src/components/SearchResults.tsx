'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import SearchBox from './SearchBox'
import { SEARCH_INDEX_FILE } from '@/lib/snapshot-path'
import { typeLabel } from '@/lib/place-types'

type Entry = { s: string; n: string; c: string; t: string; a: string; r: number | null }

const LIMIT = 60

export default function SearchResults() {
  const query = (useSearchParams().get('q') ?? '').trim()
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/${SEARCH_INDEX_FILE}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json()
      })
      .then((data: Entry[]) => active && setEntries(data))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [])

  const matches = useMemo(() => {
    if (!entries || query.length === 0) return []
    const terms = query.toLowerCase().split(/\s+/)
    return entries
      .map((entry) => {
        const haystack = `${entry.n} ${entry.c} ${entry.a} ${typeLabel(entry.t)}`.toLowerCase()
        if (!terms.every((term) => haystack.includes(term))) return null
        // Prefer name matches over city/category matches, then higher ratings.
        const score = (entry.n.toLowerCase().startsWith(terms[0]) ? 100 : 0) + (entry.r ?? 0)
        return { entry, score }
      })
      .filter((hit): hit is { entry: Entry; score: number } => hit !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMIT)
      .map((hit) => hit.entry)
  }, [entries, query])

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
      ) : entries === null ? (
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
                    <span className="shrink-0 text-sm text-gray-500">★ {entry.r}</span>
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
