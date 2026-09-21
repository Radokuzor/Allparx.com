'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { parseList, readRawList, type BrowseItem, type BrowseList } from '@/lib/browse-list'

// Nothing writes the list while a place page is open, so there is nothing to
// subscribe to — the store is only here to read it once hydration is done.
const noSubscribe = () => () => {}
const getServerSnapshot = () => null

/**
 * Previous / next chevrons over the hero. They step through the list the
 * visitor opened this place from (near-me, a category page, search results);
 * arriving from anywhere else, they step through this category in this city.
 */
export default function PlaceStepper({ slug, fallback }: { slug: string; fallback: BrowseList }) {
  const router = useRouter()
  const raw = useSyncExternalStore(noSubscribe, readRawList, getServerSnapshot)

  const list = useMemo(() => {
    const remembered = parseList(raw)
    return remembered?.items.some((item) => item.slug === slug) ? remembered : fallback
  }, [raw, slug, fallback])

  const at = list.items.findIndex((item) => item.slug === slug)
  const prev = at > 0 ? list.items[at - 1] : null
  const next = at >= 0 && at < list.items.length - 1 ? list.items[at + 1] : null

  // The arrow keys step too, unless the visitor is typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      const to = event.key === 'ArrowLeft' ? prev : event.key === 'ArrowRight' ? next : null
      if (to) router.push(`/places/${to.slug}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, router])

  if (at === -1 || (!prev && !next)) return null

  // Along the top edge: the name and save buttons sit at the bottom of the hero.
  return (
    <>
      <StepLink place={prev} direction="prev" />
      <span className="absolute left-1/2 top-6 z-10 max-w-[calc(100%-9rem)] -translate-x-1/2 truncate rounded-full bg-black/35 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
        {at + 1} of {list.items.length} · {list.label}
      </span>
      <StepLink place={next} direction="next" />
    </>
  )
}

function StepLink({ place, direction }: { place: BrowseItem | null; direction: 'prev' | 'next' }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  const base = `absolute top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full ${
    direction === 'prev' ? 'left-4' : 'right-4'
  }`

  if (!place) {
    return (
      <span aria-hidden className={`${base} bg-white/25 text-white/50`}>
        <Icon className="h-6 w-6" />
      </span>
    )
  }

  const label = `${direction === 'prev' ? 'Previous' : 'Next'}: ${place.name}`
  return (
    <Link
      href={`/places/${place.slug}`}
      aria-label={label}
      title={label}
      className={`${base} bg-white/90 text-gray-800 shadow-lg transition hover:scale-105 hover:bg-white`}
    >
      <Icon className="h-6 w-6" />
    </Link>
  )
}
