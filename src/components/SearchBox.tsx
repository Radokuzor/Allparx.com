'use client'

import { MapPin, Search, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { typeLabel, typeLabelPlural } from '@/lib/place-types'
import {
  cityHref,
  loadSearchIndex,
  rankCities,
  rankPlaces,
  type IndexedEntry,
} from '@/lib/search-index'

const MAX_PLACES = 7
const MAX_CITIES = 2

/** Below this, suggestions are noise — "a" matches most of the index. */
const MIN_QUERY = 2

type Suggestion = {
  key: string
  href: string
  label: string
  meta: string
  rating: number | null
  city: boolean
}

/** The results page for a query, optionally kept inside one category. */
export function searchHref(query: string, type?: string): string {
  const params = new URLSearchParams({ q: query })
  if (type) params.set('type', type)
  return `/search?${params}`
}

export default function SearchBox({
  defaultValue = '',
  autoFocus = false,
  type,
}: {
  defaultValue?: string
  autoFocus?: boolean
  /** Keeps suggestions and results inside one category, e.g. on /places/category/park. */
  type?: string
}) {
  const router = useRouter()
  const listId = useId()
  const formRef = useRef<HTMLFormElement>(null)

  const [value, setValue] = useState(defaultValue)
  const [index, setIndex] = useState<IndexedEntry[] | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState({ row: -1, forQuery: '' })
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null)

  // The index is ~220KB, so it is fetched on first intent to search rather
  // than on page load — the homepage hero should not pay for it up front.
  function warm() {
    if (index) return
    loadSearchIndex()
      .then(setIndex)
      .catch(() => {
        // Suggestions are an enhancement; submitting still reaches /search.
      })
  }

  const query = value.trim()

  const scoped = useMemo(
    () => (index && type ? index.filter((item) => item.entry.t === type) : index),
    [index, type],
  )

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!scoped || query.length < MIN_QUERY) return []

    // A city page lists every category, so inside one it would lead back out.
    const cities = (type ? [] : rankCities(scoped, query, MAX_CITIES)).map((hit) => ({
      key: `city:${hit.city}-${hit.state}`,
      href: cityHref(hit),
      label: `${hit.city}${hit.state ? `, ${hit.state}` : ''}`,
      meta: `${hit.count} places`,
      rating: null,
      city: true,
    }))

    const places = rankPlaces(scoped, query, MAX_PLACES).map((entry) => ({
      key: `place:${entry.s}`,
      href: `/places/${entry.s}`,
      label: entry.n,
      meta: `${typeLabel(entry.t)} · ${entry.c}${entry.a ? `, ${entry.a}` : ''}`,
      rating: entry.r,
      city: false,
    }))

    return [...cities, ...places]
  }, [scoped, type, query])

  const visible = open && suggestions.length > 0

  // The highlight is tied to the query it was made against, so typing another
  // letter drops it rather than leaving Enter pointed at a row that has since
  // scrolled out of the list. Derived here rather than reset in an effect.
  const highlight = active.forQuery === query ? active.row : -1
  const setHighlight = (row: number) => setActive({ row, forQuery: query })

  // Anchored to the viewport rather than nested in the form: the homepage hero
  // is `overflow-hidden` to clip its video, which would otherwise cut the
  // dropdown off at the bottom of the hero.
  useEffect(() => {
    if (!visible) return
    const update = () => {
      const rect = formRef.current?.getBoundingClientRect()
      if (rect) setAnchor({ top: rect.bottom + 8, left: rect.left, width: rect.width })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [visible])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  function submit() {
    if (query) go(searchHref(query, type))
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!visible) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((highlight + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight(highlight <= 0 ? suggestions.length - 1 : highlight - 1)
    }
  }

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        // Enter on a highlighted suggestion opens it; otherwise run the search.
        if (visible && highlight >= 0) go(suggestions[highlight].href)
        else submit()
      }}
      className="flex w-full gap-2"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          name="q"
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => {
            setValue(event.target.value)
            setOpen(true)
            warm()
          }}
          onFocus={() => {
            setOpen(true)
            warm()
          }}
          // Closing on blur has to wait for a suggestion's click to land.
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={
            type
              ? `Search ${typeLabelPlural(type).toLowerCase()} by name or city…`
              : 'Search parks, trails, beaches or a city…'
          }
          aria-label={type ? `Search ${typeLabelPlural(type).toLowerCase()}` : 'Search places'}
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? `${listId}-${highlight}` : undefined}
          autoComplete="off"
          className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-5 text-base text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
        />
      </div>
      <button
        type="submit"
        data-track="Search button"
        className="shrink-0 rounded-full bg-green-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-800"
      >
        Search
      </button>

      {visible &&
        anchor &&
        createPortal(
          <ul
            id={listId}
            role="listbox"
            aria-label="Search suggestions"
            style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
            className="fixed z-50 max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white py-1.5 text-left shadow-2xl"
          >
            {suggestions.map((suggestion, i) => (
              <li key={suggestion.key}>
                <button
                  type="button"
                  id={`${listId}-${i}`}
                  role="option"
                  data-track={suggestion.city ? 'Search suggestion: city' : 'Search suggestion: place'}
                  aria-selected={i === highlight}
                  // The input's blur would otherwise close the list before the
                  // click could register.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => go(suggestion.href)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === highlight ? 'bg-green-50' : 'bg-white'
                  }`}
                >
                  {suggestion.city && (
                    <MapPin className="h-4 w-4 shrink-0 text-green-700" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {suggestion.label}
                    </span>
                    <span className="block truncate text-xs text-gray-500">{suggestion.meta}</span>
                  </span>
                  {suggestion.rating !== null && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-700">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" aria-hidden />
                      {suggestion.rating}
                    </span>
                  )}
                </button>
              </li>
            ))}
            <li className="mt-1 border-t border-gray-100 pt-1">
              <button
                type="button"
                data-track="Search suggestions: see all results"
                onMouseDown={(event) => event.preventDefault()}
                onClick={submit}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-green-700 hover:bg-green-50"
              >
                See all results for “{query}”
              </button>
            </li>
          </ul>,
          document.body,
        )}
    </form>
  )
}
