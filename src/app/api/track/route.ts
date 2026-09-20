import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { geolocation, ipAddress } from '@vercel/functions'
import { IGNORE_COOKIE, SESSION_COOKIE, VISITOR_COOKIE, deviceType, isBot } from '@/lib/analytics'
import { parseEvent, saveEvent } from '@/lib/analytics-events'

/**
 * Receives interaction events from the browser (see lib/track-event.ts).
 *
 * Silent by design: every rejection is a 204, so the endpoint tells a prober
 * nothing and the page never sees an error. Events only count when they come
 * from a browser that has already loaded a page (the proxy sets the visitor
 * cookies there), which keeps scripts hitting this URL directly out of the data.
 */
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4_000
const NO_CONTENT = () => new NextResponse(null, { status: 204 })

export async function POST(request: NextRequest) {
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value
  if (!visitorId || !sessionId) return NO_CONTENT()

  // The person viewing /analytics opted out of being counted.
  if (request.cookies.get(IGNORE_COOKIE)?.value === '1') return NO_CONTENT()

  const userAgent = request.headers.get('user-agent') ?? ''
  if (isBot(userAgent, ipAddress(request) ?? null)) return NO_CONTENT()

  const raw = await request.text().catch(() => '')
  if (!raw || raw.length > MAX_BODY_BYTES) return NO_CONTENT()

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NO_CONTENT()
  }

  const event = parseEvent(body)
  if (!event) return NO_CONTENT()

  const geo = geolocation(request)
  try {
    await saveEvent(event, {
      visitorId,
      sessionId,
      device: deviceType(userAgent),
      country: geo.country ?? null,
      countryRegion: geo.countryRegion ?? null,
    })
  } catch (error) {
    console.warn('[analytics] could not save event', error)
  }
  return NO_CONTENT()
}
