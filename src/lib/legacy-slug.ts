/**
 * Slug helpers for URLs inherited from the previous (WordPress) allparx.com.
 *
 * Those URLs are /places/<name>/ with no city segment, and WordPress appended
 * -2, -3 … when several places shared a name. Both shapes are still indexed
 * and still receive search traffic, so the app has to interpret them.
 *
 * Deliberately free of server-only imports: the place page, the API routes
 * and the client-side 404 all share these.
 */

/** Place name → the legacy slug form (no city suffix). */
export function legacySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Strips WordPress's duplicate-title counter. `lincoln-park-33` was the 33rd
 * place called "Lincoln Park", so the base name is all the slug really tells
 * us — which of the 33 it meant is unrecoverable.
 */
export function baseSlug(slug: string): string {
  return slug.replace(/-\d+$/, '')
}

/**
 * True when the slug carried a duplicate-title counter. These must never be
 * resolved to a single place: the counter proves the name was ambiguous, so
 * the honest response is to show every candidate and let the visitor choose.
 */
export function isAmbiguousSlug(slug: string): boolean {
  return /-\d+$/.test(slug)
}

/** Slug → a human-readable guess at the original title, for headings. */
export function titleFromSlug(slug: string): string {
  return baseSlug(slug)
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Great-circle distance in miles; used to order candidates by proximity. */
export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}
