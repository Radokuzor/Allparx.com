'use client'

import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import PlaceCard from '@/components/PlaceCard'
import type { Place } from '@/lib/types'
import { distanceMiles } from '@/lib/legacy-slug'

type Geo = { lat: number | null; lng: number | null; city: string | null; region: string | null }

/**
 * Renders candidate places, re-ordering them nearest-first once the visitor's
 * approximate location resolves.
 *
 * The server sends the full list already sorted by rating, so the markup that
 * Googlebot indexes is complete and identical for every visitor. This only
 * changes the order afterwards, in the browser — no content is added, removed
 * or swapped, so it stays well clear of cloaking while still putting the
 * likely-intended place first.
 */
export default function NearestFirst({ places }: { places: Place[] }) {
  const [geo, setGeo] = useState<Geo | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/geo')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Geo | null) => {
        if (!cancelled && data?.lat !== null && data?.lng !== null) setGeo(data)
      })
      .catch(() => {
        // Location is a nice-to-have; the rating order is already useful.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Narrow through the values themselves: `geo?.lat` is `undefined` when geo
  // is null, and `undefined !== null` would wrongly pass a nullish check.
  const { lat, lng } = geo ?? { lat: null, lng: null }
  const origin = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null

  const ordered = origin
    ? [...places]
        .map((place) => ({
          place,
          miles:
            place.lat !== null && place.lng !== null
              ? distanceMiles(origin, { lat: place.lat, lng: place.lng })
              : Number.POSITIVE_INFINITY,
        }))
        .sort((a, b) => a.miles - b.miles)
    : places.map((place) => ({ place, miles: Number.POSITIVE_INFINITY }))

  return (
    <>
      {origin && geo?.city && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin className="h-4 w-4 text-green-700" />
          Sorted by distance from {geo.city}
          {geo.region ? `, ${geo.region}` : ''}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map(({ place, miles }) => (
          <div key={place.slug} className="relative">
            {Number.isFinite(miles) && (
              <span className="absolute right-3 top-3 z-10 rounded-full bg-gray-900/80 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi
              </span>
            )}
            <PlaceCard place={place} />
          </div>
        ))}
      </div>
    </>
  )
}
