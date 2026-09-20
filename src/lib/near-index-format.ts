/**
 * The compact per-place record behind /near-me, shared by the snapshot script
 * that writes `public/near-index.json` and the browser code that reads it.
 * No imports on purpose: the script runs under plain Node, outside Next.
 *
 * Keys are one letter because this ships to every visitor of /near-me.
 */
export type NearEntry = {
  s: string // slug
  n: string // name
  c: string // city
  a: string // state
  t: string // placeType
  r: number | null // rating
  v: number // review count
  y: number // latitude
  x: number // longitude
  f: number // amenity bitmask, see NEAR_FLAGS
}

/** Amenities a visitor can filter on, packed into `NearEntry.f`. */
export const NEAR_FLAGS = {
  freeParking: 1,
  dogs: 2,
  kids: 4,
  restrooms: 8,
} as const

export type NearFlag = keyof typeof NEAR_FLAGS

type FlagSource = {
  parking: Record<string, boolean> | null
  allowsDogs: boolean | null
  goodForChildren: boolean | null
  hasRestroom: boolean | null
}

/**
 * Only a positive signal sets a flag. Google leaves most amenities blank rather
 * than answering "no", so an unset bit means "not listed", not "doesn't have".
 * The UI words its filters accordingly.
 */
export function packFlags(place: FlagSource): number {
  const freeParking =
    place.parking !== null &&
    Object.entries(place.parking).some(([kind, present]) => present && kind.startsWith('free'))

  return (
    (freeParking ? NEAR_FLAGS.freeParking : 0) |
    (place.allowsDogs ? NEAR_FLAGS.dogs : 0) |
    (place.goodForChildren ? NEAR_FLAGS.kids : 0) |
    (place.hasRestroom ? NEAR_FLAGS.restrooms : 0)
  )
}
