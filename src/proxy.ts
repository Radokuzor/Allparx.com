import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { IGNORE_COOKIE, SESSION_COOKIE, VISITOR_COOKIE, trackVisit } from './lib/analytics'

const VISITOR_MAX_AGE = 60 * 60 * 24 * 365 * 2
// A session ends after 30 minutes without a page view.
const SESSION_MAX_AGE = 60 * 30

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = NextResponse.next()
  if (request.method !== 'GET') return response

  const existingVisitor = request.cookies.get(VISITOR_COOKIE)?.value
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value
  const context = {
    visitorId: existingVisitor ?? crypto.randomUUID(),
    sessionId: existingSession ?? crypto.randomUUID(),
    newVisitor: !existingVisitor,
    newSession: !existingSession,
  }

  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: true, path: '/' } as const
  response.cookies.set(VISITOR_COOKIE, context.visitorId, { ...cookieOptions, maxAge: VISITOR_MAX_AGE })
  response.cookies.set(SESSION_COOKIE, context.sessionId, { ...cookieOptions, maxAge: SESSION_MAX_AGE })

  // Set from the /analytics dashboard so the person viewing it doesn't
  // pollute their own numbers — see IGNORE_COOKIE.
  if (request.cookies.get(IGNORE_COOKIE)?.value !== '1') {
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
