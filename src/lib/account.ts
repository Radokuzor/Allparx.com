import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { db } from './firebase-admin'
import { getPlace } from './firestore'
import { WISHLIST, type SavedPlace } from './lists'
import { placePhoto } from './photos'

/**
 * Everything stored per signed-in person.
 *
 *   users/{uid}                 profile
 *   users/{uid}/saves/{slug}    one document per saved place
 *
 * A save keeps its own copy of the place's name, city and photo. That is
 * duplicated data, and deliberately so: the saved page then renders from a
 * single subcollection query instead of one read per saved place against a
 * ~1,300 document collection. The copy is written from the server's own lookup
 * of the slug, never from what the browser sent, so it cannot be used to
 * inject a place that does not exist.
 *
 * Firestore stays closed to browsers (see firestore.rules) — every read and
 * write below runs through the Admin SDK behind an API route that has already
 * identified the caller.
 */

/** The list names live in lib/lists.ts, which the browser imports too. */
export { VISITED, WISHLIST } from './lists'
export type { SavedPlace } from './lists'

export type Profile = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  createdAt: string | null
  savedCount: number
}

function users() {
  return db.collection('users')
}

function saves(uid: string) {
  return users().doc(uid).collection('saves')
}

/**
 * Called on every authenticated request. The first call writes the profile;
 * later ones only touch `lastSeenAt`, which is one write against a document
 * nobody is reading in a hot path.
 */
export async function ensureProfile(
  uid: string,
  email: string | null,
  extras: { displayName?: string | null; photoURL?: string | null } = {},
): Promise<Profile> {
  const ref = users().doc(uid)
  const snapshot = await ref.get()
  const now = FieldValue.serverTimestamp()

  if (!snapshot.exists) {
    await ref.set({
      email,
      displayName: extras.displayName ?? null,
      photoURL: extras.photoURL ?? null,
      createdAt: now,
      lastSeenAt: now,
    })
    return {
      uid,
      email,
      displayName: extras.displayName ?? null,
      photoURL: extras.photoURL ?? null,
      createdAt: new Date().toISOString(),
      savedCount: 0,
    }
  }

  await ref.update({ lastSeenAt: now })
  const data = snapshot.data() ?? {}
  return {
    uid,
    email: (data.email as string | null) ?? email,
    displayName: (data.displayName as string | null) ?? extras.displayName ?? null,
    photoURL: (data.photoURL as string | null) ?? extras.photoURL ?? null,
    createdAt: toIso(data.createdAt),
    savedCount: 0,
  }
}

function toIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null
}

function toSavedPlace(data: FirebaseFirestore.DocumentData): SavedPlace {
  return {
    slug: data.slug,
    name: data.name,
    city: data.city,
    state: data.state ?? null,
    placeType: data.placeType,
    rating: data.rating ?? null,
    photoUrl: data.photoUrl ?? null,
    lists: Array.isArray(data.lists) ? data.lists : [WISHLIST],
    note: data.note ?? null,
    savedAt: toIso(data.savedAt) ?? new Date(0).toISOString(),
  }
}

export async function listSaves(uid: string): Promise<SavedPlace[]> {
  const snapshot = await saves(uid).orderBy('savedAt', 'desc').limit(500).get()
  return snapshot.docs.map((doc) => toSavedPlace(doc.data()))
}

/** Just the slugs, for deciding which hearts on a page render as filled. */
export async function listSavedSlugs(uid: string): Promise<Record<string, string[]>> {
  const snapshot = await saves(uid).select('slug', 'lists').get()
  const result: Record<string, string[]> = {}
  for (const doc of snapshot.docs) {
    const data = doc.data()
    result[data.slug ?? doc.id] = Array.isArray(data.lists) ? data.lists : [WISHLIST]
  }
  return result
}

export type ToggleResult =
  | { ok: true; saved: boolean; place: SavedPlace | null }
  | { ok: false; error: string }

/**
 * Adds or removes `list` for one place, and deletes the document once it
 * belongs to no list at all — an empty save is just a row nobody asked for.
 */
export async function toggleSave(uid: string, slug: string, list: string): Promise<ToggleResult> {
  const ref = saves(uid).doc(slug)
  const existing = await ref.get()

  if (existing.exists) {
    const current = toSavedPlace(existing.data()!)
    const next = current.lists.includes(list)
      ? current.lists.filter((entry) => entry !== list)
      : [...current.lists, list]

    if (next.length === 0) {
      await ref.delete()
      return { ok: true, saved: false, place: null }
    }
    await ref.update({ lists: next })
    return { ok: true, saved: next.includes(list), place: { ...current, lists: next } }
  }

  // First save of this place: take the details from our own copy of the place,
  // so a hand-written request cannot plant a fake entry in someone's list.
  const place = await getPlace(slug)
  if (!place) return { ok: false, error: 'We do not have a place with that name.' }

  const image = placePhoto(place)
  const record = {
    slug: place.slug,
    name: place.name,
    city: place.city,
    state: place.state,
    placeType: place.placeType,
    rating: place.rating,
    photoUrl: image?.photo.url ?? null,
    lists: [list],
    note: null,
    savedAt: FieldValue.serverTimestamp(),
  }
  await ref.set(record)

  return {
    ok: true,
    saved: true,
    place: { ...toSavedPlace(record), savedAt: new Date().toISOString() },
  }
}

export async function setNote(uid: string, slug: string, note: string | null): Promise<boolean> {
  const ref = saves(uid).doc(slug)
  if (!(await ref.get()).exists) return false
  await ref.update({ note: note?.slice(0, 500) || null })
  return true
}
