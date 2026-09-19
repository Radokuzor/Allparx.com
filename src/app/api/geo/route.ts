import { NextResponse } from 'next/server'
import { geolocation } from '@vercel/functions'
import type { NextRequest } from 'next/server'

/**
 * The visitor's approximate location, from Vercel's edge geolocation headers.
 *
 * Exists so that pages which are statically rendered and CDN-cached can still
 * order things by proximity: the HTML is identical for everyone (and so is
 * what Googlebot indexes), and the client re-sorts after this resolves.
 * Serving different *content* per IP would hide one version from the crawler,
 * which only ever visits from a single region — ordering is safe, swapping is
 * not.
 */
export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const geo = geolocation(request)
  const lat = geo.latitude ? Number(geo.latitude) : null
  const lng = geo.longitude ? Number(geo.longitude) : null

  return NextResponse.json(
    {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      city: geo.city ? decodeURIComponent(geo.city) : null,
      region: geo.countryRegion ?? null,
    },
    // Per-visitor, and cheap to recompute — never cache it at the edge.
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
