import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { resolveLocation } from '@/lib/geo-lookup'

/**
 * Resolves a typed ZIP code or city to coordinates for the "near me" page.
 *
 * Pure table lookup — no external call, so there is nothing here to bill or
 * abuse. Deliberately not tracked: the analytics proxy skips /api, and the
 * result depends only on the query, never on who asks, so it is safe to cache.
 */
export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (q === null) return NextResponse.json({ error: 'Missing q' }, { status: 400 })

  return NextResponse.json(
    { matches: resolveLocation(q) },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
