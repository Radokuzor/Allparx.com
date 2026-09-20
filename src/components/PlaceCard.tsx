import Image from 'next/image'
import Link from 'next/link'
import { Baby, Bath, PawPrint, Star } from 'lucide-react'
import SaveButton from '@/components/SaveButton'
import type { Place } from '@/lib/firestore'
import { photoAtWidth, placePhoto } from '@/lib/photos'
import { typeLabel } from '@/lib/place-types'

export default function PlaceCard({ place }: { place: Place }) {
  const image = placePhoto(place)

  return (
    <Link
      href={`/places/${place.slug}`}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-lg"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-green-700 to-emerald-400 sm:h-48">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
          {typeLabel(place.placeType)}
        </span>
        {/* The heart takes the top-right corner, so the rating moves down to
            the darkened edge of the photo where it still reads clearly. */}
        <SaveButton slug={place.slug} name={place.name} className="absolute right-3 top-3" />
        {place.rating !== null && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            {place.rating}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-semibold text-gray-900 transition-colors group-hover:text-green-700">
          {place.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-gray-500">
          {place.city}
          {place.state ? `, ${place.state}` : ''} · {place.address}
        </p>
        {(place.allowsDogs || place.goodForChildren || place.hasRestroom) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
            {place.allowsDogs && (
              <span className="flex items-center gap-1">
                <PawPrint className="h-3.5 w-3.5" /> Dogs OK
              </span>
            )}
            {place.goodForChildren && (
              <span className="flex items-center gap-1">
                <Baby className="h-3.5 w-3.5" /> Family
              </span>
            )}
            {place.hasRestroom && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" /> Restrooms
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
