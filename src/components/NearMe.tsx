'use client'

import Link from 'next/link'
import { Baby, Bath, Car, LocateFixed, MapPin, PawPrint, Star } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { NEAR_FLAGS, type NearEntry, type NearFlag } from '@/lib/near-index-format'
import {
  RADIUS_OPTIONS,
  SORT_LABELS,
  applyFilters,
  facetCounts,
  loadNearIndex,
  meanRating,
  round3,
  sortRanked,
  summarizeSupply,
  withDistance,
  type Origin,
  type SortKey,
} from '@/lib/near-me'
import { typeLabel, typeLabelPlural } from '@/lib/place-types'
import { coarsen, track } from '@/lib/track-event'

const PAGE = 20

const AMENITIES: { key: NearFlag; label: string; Icon: typeof Car }[] = [
  { key: 'freeParking', label: 'Free parking', Icon: Car },
  { key: 'dogs', label: 'Dogs welcome', Icon: PawPrint },
  { key: 'kids', label: 'Kid-friendly', Icon: Baby },
  { key: 'restrooms', label: 'Restrooms', Icon: Bath },
]

// --- Remembered location ------------------------------------------------------
//
// Kept in the browser only, so a return visit skips the question. It is a
// per-visitor convenience: when storage is blocked the in-memory copy still
// carries the session, it just isn't remembered afterwards.

const STORAGE_KEY = 'allparx:near-me'
const listeners = new Set<() => void>()
let cached: string | null | undefined

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    cached = readStorage()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

const getSnapshot = () => (cached === undefined ? (cached = readStorage()) : cached)
const getServerSnapshot = () => null

function saveOrigin(origin: Origin | null) {
  cached = origin ? JSON.stringify(origin) : null
  try {
    if (cached) window.localStorage.setItem(STORAGE_KEY, cached)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the in-memory copy above still serves this session.
  }
  listeners.forEach((listener) => listener())
}

function parseOrigin(raw: string | null): Origin | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<Origin>
    return typeof value.lat === 'number' &&
      typeof value.lng === 'number' &&
      typeof value.label === 'string'
      ? { lat: value.lat, lng: value.lng, label: value.label }
      : null
  } catch {
    return null
  }
}

// --- Component -----------------------------------------------------------------

type Match = { label: string; lat: number; lng: number }

/** A search the visitor just made, waiting for the place index to score it. */
type PendingSearch = { method: 'gps' | 'lookup'; query?: string; label?: string }

export default function NearMe() {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const origin = useMemo(() => parseOrigin(stored), [stored])

  const [entries, setEntries] = useState<NearEntry[] | null>(null)
  const [failed, setFailed] = useState(false)

  const [text, setText] = useState('')
  const [busy, setBusy] = useState<'gps' | 'lookup' | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [alternates, setAlternates] = useState<Match[]>([])

  const [types, setTypes] = useState<ReadonlySet<string>>(() => new Set())
  const [amenities, setAmenities] = useState(0)
  const [radius, setRadius] = useState(25)
  const [sort, setSort] = useState<SortKey>('top')
  const [shown, setShown] = useState({ count: PAGE, signature: '' })
  const pendingSearch = useRef<PendingSearch | null>(null)

  useEffect(() => {
    let live = true
    loadNearIndex()
      .then((data) => live && setEntries(data))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])

  const all = useMemo(
    () => (entries && origin ? withDistance(entries, origin) : null),
    [entries, origin],
  )
  const mean = useMemo(() => (entries ? meanRating(entries) : 0), [entries])
  const filters = useMemo(() => ({ types, amenities, radius }), [types, amenities, radius])
  const counts = useMemo(() => (all ? facetCounts(all, filters) : null), [all, filters])

  const view = useMemo(() => {
    if (!all) return null
    const within = applyFilters(all, filters)
    if (within.length > 0 || radius === 0) {
      return { items: sortRanked(within, sort, mean), widened: false }
    }
    // Coverage is uneven, so an empty radius is common. Rather than a dead end,
    // show what is closest that still matches the other filters.
    const anywhere = applyFilters(all, { ...filters, radius: 0 })
    return { items: sortRanked(anywhere, 'nearest', mean), widened: anywhere.length > 0 }
  }, [all, filters, radius, sort, mean])

  // Report what a fresh search found, once the index has scored it. Only
  // searches the visitor just made count — a remembered location that loads
  // on a return visit isn't a new search.
  useEffect(() => {
    const search = pendingSearch.current
    if (!search || !all || !origin) return
    pendingSearch.current = null
    track({
      type: 'near_me_search',
      method: search.method,
      outcome: 'ok',
      query: search.query,
      label: search.label,
      // Coarsened here so a precise GPS fix never leaves the browser.
      lat: coarsen(origin.lat),
      lng: coarsen(origin.lng),
      supply: summarizeSupply(all),
    })
  }, [all, origin])

  // Back to the first page whenever anything that changes the list changes.
  const signature = `${origin?.label}|${[...types].sort().join()}|${amenities}|${radius}|${sort}`
  const visibleCount = shown.signature === signature ? shown.count : PAGE

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      track({ type: 'near_me_search', method: 'gps', outcome: 'gps_failed', reason: 'unsupported' })
      setProblem('This browser can’t share its location. Enter a ZIP code or city instead.')
      return
    }
    setBusy('gps')
    setProblem(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(null)
        setAlternates([])
        pendingSearch.current = { method: 'gps' }
        saveOrigin({
          lat: round3(position.coords.latitude),
          lng: round3(position.coords.longitude),
          label: 'Your current location',
        })
      },
      (error) => {
        setBusy(null)
        track({
          type: 'near_me_search',
          method: 'gps',
          outcome: 'gps_failed',
          reason:
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'unavailable',
        })
        setProblem(
          error.code === error.PERMISSION_DENIED
            ? 'Location access is blocked for this site. Enter a ZIP code or city instead.'
            : error.code === error.TIMEOUT
              ? 'Finding your location took too long. Try again, or enter a ZIP code or city.'
              : 'Your location isn’t available right now. Enter a ZIP code or city instead.',
        )
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }

  async function lookUp(event: FormEvent) {
    event.preventDefault()
    const query = text.trim()
    if (!query) return

    setBusy('lookup')
    setProblem(null)
    try {
      const response = await fetch(`/api/locate?q=${encodeURIComponent(query)}`)
      const { matches } = (await response.json()) as { matches: Match[] }
      if (matches.length === 0) {
        track({ type: 'near_me_search', method: 'lookup', outcome: 'not_found', query })
        setProblem(`We couldn’t find “${query}”. Try a 5-digit ZIP code or a city like “Austin, TX”.`)
        return
      }
      const [best, ...rest] = matches
      setAlternates(rest)
      pendingSearch.current = { method: 'lookup', query, label: best.label }
      saveOrigin(best)
    } catch {
      setProblem('Something went wrong looking that up. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  function toggleType(type: string) {
    setTypes((current) => {
      const next = new Set(current)
      if (!next.delete(type)) next.add(type)
      return next
    })
  }

  // --- No location yet -----------------------------------------------------------

  if (!origin) {
    return (
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-green-700 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60 sm:w-auto"
        >
          <LocateFixed className="h-5 w-5" />
          {busy === 'gps' ? 'Finding you…' : 'Use my current location'}
        </button>

        <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-gray-400">
          <span className="h-px flex-1 bg-gray-100" />
          or
          <span className="h-px flex-1 bg-gray-100" />
        </div>

        <form onSubmit={lookUp} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="ZIP code or city, e.g. 78701 or Austin, TX"
            aria-label="ZIP code or city"
            autoComplete="off"
            className="w-full flex-1 rounded-full border border-gray-200 bg-white px-5 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />
          <button
            type="submit"
            disabled={busy !== null || text.trim().length === 0}
            className="shrink-0 rounded-full border border-green-700 px-6 py-3 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
          >
            {busy === 'lookup' ? 'Looking…' : 'Find places'}
          </button>
        </form>

        {problem && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {problem}
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-gray-400">
          Your exact location never leaves your browser. We only note the general area you searched
          (like “Austin, TX”) and how many places we found there, so we know where to add more.
        </p>
      </div>
    )
  }

  // --- Results ---------------------------------------------------------------------

  const typeChips = counts
    ? [...new Set([...counts.types.keys(), ...types])].sort(
        (a, b) => (counts.types.get(b) ?? 0) - (counts.types.get(a) ?? 0),
      )
    : []

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <MapPin className="h-4.5 w-4.5 shrink-0 text-green-700" />
        <p className="text-sm text-gray-500">
          Showing places near <span className="font-semibold text-gray-900">{origin.label}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setAlternates([])
            setProblem(null)
            saveOrigin(null)
          }}
          className="ml-auto text-sm font-semibold text-green-700 hover:underline"
        >
          Change
        </button>
        {alternates.length > 0 && (
          <p className="basis-full text-xs text-gray-500">
            Not the right one?{' '}
            {alternates.map((match, i) => (
              <span key={match.label}>
                {i > 0 && ' · '}
                <button
                  type="button"
                  onClick={() => {
                    setAlternates(alternates.filter((other) => other !== match))
                    saveOrigin(match)
                  }}
                  className="font-medium text-green-700 hover:underline"
                >
                  {match.label}
                </button>
              </span>
            ))}
          </p>
        )}
      </div>

      {failed ? (
        <p className="mt-8 text-gray-500">
          We couldn’t load places right now. Try{' '}
          <Link href="/places" className="text-green-700 hover:underline">
            browsing by category
          </Link>{' '}
          instead.
        </p>
      ) : !view || !counts ? (
        <p className="mt-8 text-gray-400">Finding places near you…</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="mt-1 block rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium normal-case tracking-normal text-gray-900"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Within
              <select
                value={radius}
                onChange={(event) => setRadius(Number(event.target.value))}
                className="mt-1 block rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium normal-case tracking-normal text-gray-900"
              >
                {RADIUS_OPTIONS.map((miles) => (
                  <option key={miles} value={miles}>
                    {miles === 0 ? 'Any distance' : `${miles} miles`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Category</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              {typeChips.map((type) => (
                <Chip
                  key={type}
                  active={types.has(type)}
                  onClick={() => toggleType(type)}
                  label={typeLabelPlural(type)}
                  count={counts.types.get(type) ?? 0}
                />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Good to know</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AMENITIES.map(({ key, label, Icon }) => (
                <Chip
                  key={key}
                  active={(amenities & NEAR_FLAGS[key]) !== 0}
                  onClick={() => setAmenities((current) => current ^ NEAR_FLAGS[key])}
                  label={label}
                  count={counts.amenities[key]}
                  Icon={Icon}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              These match places where Google lists the detail. Many places don’t, so the true
              number is higher.
            </p>
          </div>

          <p aria-live="polite" className="mt-8 text-sm text-gray-500">
            {view.items.length === 0 ? (
              'No places match those filters. Try removing one.'
            ) : view.widened ? (
              <>
                Nothing within {radius} miles. Here’s what’s closest, starting{' '}
                <span className="font-medium text-gray-700">
                  {formatMiles(view.items[0].miles)}
                </span>{' '}
                away.
              </>
            ) : (
              <>
                <span className="font-medium text-gray-700">{view.items.length}</span>{' '}
                {view.items.length === 1 ? 'place' : 'places'}
              </>
            )}
          </p>

          <ul className="mt-2 divide-y divide-gray-100">
            {view.items.slice(0, visibleCount).map(({ entry, miles }) => (
              <li key={entry.s}>
                <Link
                  href={`/places/${entry.s}`}
                  className="flex items-start justify-between gap-4 py-4 transition-colors hover:text-green-700"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-900">{entry.n}</span>
                    <span className="mt-0.5 block text-sm text-gray-500">
                      {typeLabel(entry.t)} · {entry.c}
                      {entry.a ? `, ${entry.a}` : ''}
                    </span>
                    <Badges flags={entry.f} />
                  </span>
                  <span className="shrink-0 text-right">
                    {entry.r !== null ? (
                      <span className="flex items-center justify-end gap-1 text-sm font-semibold text-gray-800">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                        {entry.r}
                        <span className="font-normal text-gray-400">
                          ({entry.v.toLocaleString('en-US')})
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Not yet rated</span>
                    )}
                    <span className="mt-0.5 block text-sm text-gray-500">{formatMiles(miles)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {view.items.length > visibleCount && (
            <button
              type="button"
              onClick={() => setShown({ count: visibleCount + PAGE, signature })}
              className="mt-6 w-full rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-green-200 hover:text-green-700 sm:w-auto"
            >
              Show more
            </button>
          )}
        </>
      )}
    </div>
  )
}

function formatMiles(miles: number): string {
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles).toLocaleString('en-US')} mi`
}

function Badges({ flags }: { flags: number }) {
  const present = AMENITIES.filter(({ key }) => flags & NEAR_FLAGS[key])
  if (present.length === 0) return null
  return (
    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
      {present.map(({ key, label, Icon }) => (
        <span key={key} className="flex items-center gap-1">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
      ))}
    </span>
  )
}

function Chip({
  active,
  onClick,
  label,
  count,
  Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  Icon?: typeof Car
}) {
  // A chip that would return nothing stays visible but inert, so the option
  // doesn't appear and vanish as other filters change. Selected chips never
  // disable, or a visitor could get stuck unable to un-select one.
  const empty = count === 0 && !active
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={empty}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-green-700 bg-green-700 text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:text-green-700'
      } ${empty ? 'cursor-not-allowed opacity-40 hover:border-gray-200 hover:text-gray-700' : ''}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span className={active ? 'text-white/70' : 'text-gray-400'}>{count}</span>
    </button>
  )
}
