'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, Loader2, Star, TreePine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { LIST_LABEL, VISITED, WISHLIST, type SavedPlace } from '@/lib/lists'
import { typeLabel } from '@/lib/place-types'

/**
 * Renders one of a person's lists.
 *
 * Everything shown comes from the saved documents themselves — name, city,
 * photo — so this is a single query no matter how many places are in the list.
 * See lib/account.ts for why those fields are duplicated there.
 */

type Props = {
  list: typeof WISHLIST | typeof VISITED
  intro: string
  emptyLine: string
}

/** Commons serves fixed widths; stored URLs are the 1280px rendition. */
function atWidth(url: string, width: number): string {
  return url.replace('/1280px-', `/${width}px-`)
}

export default function SavedPlacesView({ list, intro, emptyLine }: Props) {
  const { status, openSignIn, authedFetch, saved, toggleSave } = useAuth()
  const [places, setPlaces] = useState<SavedPlace[] | null>(null)

  useEffect(() => {
    if (status !== 'signed-in') return
    let active = true

    void (async () => {
      const response = await authedFetch('/api/me/saves').catch(() => null)
      if (!active) return
      if (!response?.ok) {
        setPlaces([])
        return
      }
      const data = (await response.json()) as { places?: SavedPlace[] }
      if (active) setPlaces(data.places ?? [])
    })()

    return () => {
      active = false
    }
  }, [status, authedFetch])

  if (status === 'loading') {
    return (
      <p className="flex items-center gap-2 py-16 text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading
      </p>
    )
  }

  if (status === 'signed-out') {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-6 py-16 text-center">
        <TreePine className="mx-auto h-8 w-8 text-green-700" strokeWidth={2} />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Sign in to see your list</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">{intro}</p>
        <button
          type="button"
          data-track="Sign in (saved places)"
          onClick={() => openSignIn()}
          className="mt-5 rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
        >
          Sign in
        </button>
      </div>
    )
  }

  // The fetched list is the source for the cards, but membership comes from the
  // shared map, so unsaving a place here updates the page without a refetch.
  const visible = (places ?? []).filter((place) => (saved[place.slug] ?? []).includes(list))

  if (places === null) {
    return (
      <p className="flex items-center gap-2 py-16 text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your places
      </p>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
        <Heart className="mx-auto h-7 w-7 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">{emptyLine}</p>
        <Link
          href="/places"
          className="mt-5 inline-block rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
        >
          Browse places
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((place) => (
        <div
          key={place.slug}
          className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-lg"
        >
          <Link href={`/places/${place.slug}`} className="block">
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-green-700 to-emerald-400">
              {place.photoUrl && (
                <Image
                  src={atWidth(place.photoUrl, 500)}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
                {typeLabel(place.placeType)}
              </span>
              {place.rating !== null && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  {place.rating}
                </span>
              )}
            </div>
            <div className="p-4 pr-12">
              <h3 className="line-clamp-1 font-semibold text-gray-900 transition-colors group-hover:text-green-700">
                {place.name}
              </h3>
              <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                {place.city}
                {place.state ? `, ${place.state}` : ''}
              </p>
              {place.lists.length > 1 && (
                <p className="mt-2 text-xs font-medium text-green-700">
                  {place.lists
                    .filter((entry) => entry !== list)
                    .map((entry) => LIST_LABEL[entry] ?? entry)
                    .join(' · ')}
                </p>
              )}
            </div>
          </Link>

          <button
            type="button"
            data-track="Remove from saved list"
            onClick={() => void toggleSave(place.slug, list)}
            aria-label={`Remove ${place.name} from this list`}
            className="absolute bottom-4 right-3 flex h-9 w-9 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Heart className="h-4.5 w-4.5 fill-current" />
          </button>
        </div>
      ))}
    </div>
  )
}
