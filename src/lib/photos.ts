import categoryPhotos from '@/data/category-photos.json'
import { getEditorial } from './place-editorial'

/** A Wikimedia Commons image plus everything its licence requires us to show. */
export type Photo = {
  url: string
  width: number
  height: number
  title: string
  author: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}

const byCategory = categoryPhotos as Record<string, Photo[]>

function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * A hand-picked editorial photo first, then the place's own Commons photo when
 * one was matched, then a category photo standing in for it. `illustrative` is
 * true for the stand-in, which must not be presented as the venue itself.
 *
 * The editorial pick leads so that the hero, the cards in every grid and the
 * social preview all show the same picture — and so it survives the next
 * `npm run photos:places`, which rewrites the `photo` field.
 */
export function placePhoto(place: {
  slug: string
  placeType: string
  photo?: Photo | null
}): { photo: Photo; illustrative: boolean } | null {
  const chosen = getEditorial(place.slug)?.photos?.[0]
  if (chosen) return { photo: chosen.photo, illustrative: false }
  if (place.photo) return { photo: place.photo, illustrative: false }
  const pool = byCategory[place.placeType] ?? []
  if (pool.length === 0) return null
  return { photo: pool[hash(place.slug) % pool.length], illustrative: true }
}

/** Commons renders fixed widths; stored URLs are the 1280px rendition. */
export function photoAtWidth(url: string, width: 500 | 960 | 1280): string {
  return url.replace('/1280px-', `/${width}px-`)
}
