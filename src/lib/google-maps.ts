/**
 * Google Maps links and embeds.
 *
 * The Maps Embed API is free and unlimited, but its key ships to the browser in
 * the iframe URL. That key must therefore be a separate, referrer-restricted
 * key scoped to the Embed API alone — never GOOGLE_PLACES_API_KEY, which is
 * server-side and billed per request.
 *
 * Both helpers return null when they lack what they need, so callers can omit
 * the map entirely rather than render a broken frame.
 */

type PlaceRef = {
  googlePlaceId: string | null
  lat: number | null
  lng: number | null
}

function query(place: PlaceRef): string | null {
  if (place.googlePlaceId) return `place_id:${place.googlePlaceId}`
  if (place.lat !== null && place.lng !== null) return `${place.lat},${place.lng}`
  return null
}

export function mapEmbedUrl(place: PlaceRef): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
  const q = query(place)
  if (!key || !q) return null
  return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(q)}`
}

/** The place's Google listing — its photos and reviews live here, for free. */
export function googleListingUrl(place: PlaceRef): string | null {
  const q = query(place)
  if (!q) return null
  const params = new URLSearchParams({ api: '1', query: q })
  if (place.googlePlaceId) {
    params.set('query', `${place.lat ?? ''},${place.lng ?? ''}`)
    params.set('query_place_id', place.googlePlaceId)
  }
  return `https://www.google.com/maps/search/?${params.toString()}`
}
