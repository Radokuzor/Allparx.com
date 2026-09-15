import type { Place } from '@/lib/firestore'
import PlaceCard from './PlaceCard'

export default function PlaceGrid({ places, wide = false }: { places: Place[]; wide?: boolean }) {
  if (places.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
        Nothing listed here yet.
      </p>
    )
  }

  return (
    <div
      className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 ${wide ? 'xl:grid-cols-4' : ''}`}
    >
      {places.map((place) => (
        <PlaceCard key={place.slug} place={place} />
      ))}
    </div>
  )
}
