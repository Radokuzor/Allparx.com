'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import SearchBox from './SearchBox'
import { loadSearchIndex, normalize, type IndexedEntry, type SearchEntry } from '@/lib/search-index'
import { baseSlug, titleFromSlug } from '@/lib/legacy-slug'
import { typeLabel } from '@/lib/place-types'

/**
 * Turns the 404 into a way forward.
 *
 * Most dead URLs here are inherited from the previous allparx.com, so the
 * slug still carries the place name the visitor wanted. The 404 page is
 * statically rendered and cannot be told which URL failed, so the pathname is
 * read in the browser and matched against the same static index the search
 * page uses — no extra request beyond the one search already makes.
 */
export default function NotFoundSuggestions() {
  const pathname = usePathname()
  const [entries, setEntries] = useState<IndexedEntry[] | null>(null)

  const slug = useMemo(() => {
    const match = /^\/places\/([^/]+)\/?$/.exec(pathname ?? '')
    return match && match[1] !== 'category' ? match[1] : null
  }, [pathname])

  useEffect(() => {
    if (!slug) return
    let active = true
    loadSearchIndex()
      .then((loaded) => active && setEntries(loaded))
      .catch(() => {
        // Suggestions are a bonus; the links below always work.
      })
    return () => {
      active = false
    }
  }, [slug])

  const title = slug ? titleFromSlug(slug) : null

  const matches = useMemo(() => {
    if (!entries || !slug) return []
    const terms = normalize(baseSlug(slug)).split('-').filter(Boolean)
    if (terms.length === 0) return []

    // Deliberately a partial match, unlike the search scorer: a dead legacy
    // slug rarely matches a live place on every word, so rank by how much of
    // it matched rather than requiring all of it.
    return entries
      .map(({ entry, haystack }) => {
        const hits = terms.filter((term) => haystack.includes(term)).length
        if (hits === 0) return null
        return { entry, score: hits / terms.length + (entry.r ?? 0) / 10 }
      })
      .filter((hit): hit is { entry: SearchEntry; score: number } => hit !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((hit) => hit.entry)
  }, [entries, slug])

  return (
    <div className="mt-10 text-left">
      <div className="mx-auto max-w-xl">
        <SearchBox defaultValue={title ? baseSlug(slug!).replace(/-/g, ' ') : ''} />
      </div>

      {matches.length > 0 && (
        <div className="mx-auto mt-10 max-w-xl">
          <h2 className="text-sm font-semibold text-gray-900">
            {title ? `Closest matches to “${title}”` : 'You might be looking for'}
          </h2>
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
            {matches.map((entry) => (
              <li key={entry.s}>
                <Link
                  href={`/places/${entry.s}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-green-50/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {entry.n}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {typeLabel(entry.t)} · {entry.c}, {entry.a}
                    </span>
                  </span>
                  {entry.r !== null && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-700">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {entry.r}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
