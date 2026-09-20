import { NextResponse } from 'next/server'
import { geolocation } from '@vercel/functions'
import type { NextRequest } from 'next/server'
import { notifyEnquiry, saveEnquiry, validateEnquiry } from '@/lib/stay-enquiry'

/**
 * Receives a stay enquiry from a hotel page.
 *
 * This writes personal data, so it never runs at build time and is never
 * cached. It is also not a booking endpoint: it stores a request to be
 * contacted and pings Telegram, and there is intentionally no code path that
 * confirms, holds or charges anything.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const result = validateEnquiry((body ?? {}) as Record<string, unknown>)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const geo = geolocation(request)
  const enquiry = {
    ...result.enquiry,
    createdAt: new Date(),
    // Country only. A full IP is personal data we have no use for here, and
    // the analytics pipeline already keeps its own record of the visit.
    country: geo.country ?? null,
    userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  }

  let id: string
  try {
    id = await saveEnquiry(enquiry)
  } catch (error) {
    console.error('[enquiry] could not save', error)
    return NextResponse.json(
      { error: 'We could not save that just now. Please try again shortly.' },
      { status: 503 },
    )
  }

  // The enquiry is already durable, so a dead Telegram bot must not turn a
  // successful submission into an error the traveller sees.
  await notifyEnquiry(enquiry, id)

  return NextResponse.json({ ok: true, id }, { headers: { 'Cache-Control': 'no-store' } })
}
