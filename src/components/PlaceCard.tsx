import Image from 'next/image'
import Link from 'next/link'
import type { Place } from '@/lib/firestore'
import { photoAtWidth, placePhoto } from '@/lib/photos'
import { typeLabel } from '@/lib/place-types'

export default function PlaceCard({ place }: { place: Place }) {
  const image = placePhoto(place)

  return (
    <Link
      href={`/places/${place.slug}`}
      className="group block overflow-hidden rounded-xl border border-gray-100 transition-all hover:border-green-200 hover:shadow-md"
    >
      <div className="relative flex h-40 items-end overflow-hidden bg-gradient-to-br from-green-700 to-emerald-400 p-4">
        {image && (
          <>
            {/* Commons already serves sized renditions, so skip Vercel's optimizer. */}
            <Image
              src={photoAtWidth(image.photo.url, 500)}
              alt={image.illustrative ? '' : place.name}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <span className="absolute right-2 top-2 max-w-[75%] truncate rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white/85">
              {image.photo.author} · {image.photo.license}
            </span>
          </>
        )}
        <span className="relative text-xs font-semibold uppercase tracking-wide text-white/90">
          {typeLabel(place.placeType)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-semibold text-gray-900 transition-colors group-hover:text-green-700">
          {place.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-gray-500">
          {place.city}
          {place.state ? `, ${place.state}` : ''} · {place.address}
        </p>
        {place.rating !== null && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-sm text-yellow-500">★</span>
            <span className="text-sm font-medium text-gray-700">{place.rating}</span>
            <span className="text-sm text-gray-400">({place.reviewCount.toLocaleString()})</span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
          {place.allowsDogs && <span>🐕 Dogs OK</span>}
          {place.goodForChildren && <span>👶 Family</span>}
          {place.hasRestroom && <span>🚻 Restrooms</span>}
        </div>
      </div>
    </Link>
  )
}
