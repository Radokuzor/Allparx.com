import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import type { Hotel } from '@/lib/hotels'
import { photoAtWidth } from '@/lib/photos'

/**
 * A hotel in a grid. Mirrors PlaceCard's shape so the two read as one site.
 *
 * The rating is Google's aggregate, shown with its review count — never a
 * score of our own, and never a review we wrote.
 */
export default function HotelCard({ hotel }: { hotel: Hotel }) {
  const hero = hotel.photos[0]

  return (
    <Link
      href={`/hotels/${hotel.slug}`}
      className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all hover:-translate-y-0.5 hover:border-green-200 hover:shadow-lg"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-green-700 to-emerald-400 sm:h-48">
        {hero && (
          <>
            {/* Commons already serves sized renditions, so skip Vercel's optimizer. */}
            <Image
              src={photoAtWidth(hero.photo.url, 500)}
              alt={hotel.name}
              fill
              unoptimized
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
          {hotel.brand}
        </span>
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
          {hotel.rating}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 font-semibold text-gray-900 transition-colors group-hover:text-green-700">
          {hotel.name}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">
            {hotel.where}, {hotel.country}
          </span>
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">{hotel.tagline}</p>
        <p className="mt-3 text-xs text-gray-400">
          {hotel.rating} on Google · {hotel.reviewCount.toLocaleString('en-US')} reviews
        </p>
      </div>
    </Link>
  )
}
