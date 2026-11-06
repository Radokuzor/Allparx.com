import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import {
  HIT_COOKIE,
  IGNORE_COOKIE,
  SESSION_COOKIE,
  VISITOR_COOKIE,
  isAssetPath,
  trackVisit,
} from './lib/analytics'
import { REDIRECT_MARKER } from './lib/dead-url'

const VISITOR_MAX_AGE = 60 * 60 * 24 * 365 * 2
// A session ends after 30 minutes without a page view.
const SESSION_MAX_AGE = 60 * 30
// How long the page has to phone home about this particular hit.
const HIT_MAX_AGE = 60 * 10

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = NextResponse.next()
  if (request.method !== 'GET') return response
  // Files are not page views, and must not mint visitor cookies either.
  if (isAssetPath(request.nextUrl.pathname)) return response

  const existingVisitor = request.cookies.get(VISITOR_COOKIE)?.value
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value
  const context = {
    visitorId: existingVisitor ?? crypto.randomUUID(),
    sessionId: existingSession ?? crypto.randomUUID(),
    newVisitor: !existingVisitor,
    newSession: !existingSession,
    hitId: crypto.randomUUID(),
  }

  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: true, path: '/' } as const
  response.cookies.set(VISITOR_COOKIE, context.visitorId, { ...cookieOptions, maxAge: VISITOR_MAX_AGE })
  response.cookies.set(SESSION_COOKIE, context.sessionId, { ...cookieOptions, maxAge: SESSION_MAX_AGE })
  /**
   * Deliberately readable by JavaScript: the page-view beacon reads it to say
   * "this exact hit was a real browser". Without it the beacon would have to
   * search for the document, and a scraper replaying the id could claim
   * someone else's hit.
   */
  response.cookies.set(HIT_COOKIE, context.hitId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: HIT_MAX_AGE,
  })

  // A dead URL was already counted when it was requested; the redirect that
  // lands on `/` is the same visit, not a second page view.
  const followedDeadUrl = request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has(REDIRECT_MARKER)

  // Set from the /analytics dashboard so the person viewing it doesn't
  // pollute their own numbers — see IGNORE_COOKIE.
  if (!followedDeadUrl && request.cookies.get(IGNORE_COOKIE)?.value !== '1') {
    event.waitUntil(
      trackVisit(request, context).catch((error) => console.warn('[analytics] trackVisit failed', error)),
    )
  }
  return response
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api|analytics|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|opengraph-image).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
