/**
 * Shared between the browser and the server, so it imports neither.
 *
 * A saved place carries an array of list names rather than one, because the
 * two built-ins are not alternatives: a park you have been to is often also
 * one you want to go back to.
 */

export const WISHLIST = 'wishlist'
export const VISITED = 'visited'

export const BUILT_IN_LISTS = [WISHLIST, VISITED] as const

export const LIST_LABEL: Record<string, string> = {
  [WISHLIST]: 'Want to go',
  [VISITED]: 'My parks',
}

export type SavedPlace = {
  slug: string
  name: string
  city: string
  state: string | null
  placeType: string
  rating: number | null
  photoUrl: string | null
  lists: string[]
  note: string | null
  savedAt: string
}

/** slug → the lists it belongs to, as the app holds it in memory. */
export type SavedMap = Record<string, string[]>
