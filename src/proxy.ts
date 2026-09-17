import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { trackVisit } from './lib/analytics'

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (request.method === 'GET') {
    event.waitUntil(trackVisit(request).catch((error) => console.warn('[analytics] trackVisit failed', error)))
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|opengraph-image).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
