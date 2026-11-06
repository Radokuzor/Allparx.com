import { NextResponse } from 'next/server'
import { geolocation } from '@vercel/functions'
import type { NextRequest } from 'next/server'
import { submitGuideRequest, validateRequest } from '@/lib/guide-request'

/**
 * Receives "send me a local guide for <place>" from the block in an article.
 *
 * Writes an email address, so it never runs at build time and is never cached.
 * The address is stored before the welcome email is attempted: an email that
 * fails to send is still a person who asked, and dropping the record would
 * silently lose the guide they are waiting for.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const result = validateRequest((body ?? {}) as Record<string, unknown>)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const geo = geolocation(request)

  try {
    const saved = await submitGuideRequest({
      email: result.email,
      placeSlug: result.placeSlug,
      path: result.path,
      country: geo.country ?? null,
      userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
    })
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 404 })
    }
    return NextResponse.json(
      { ok: true, id: saved.id },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[guide] could not save request', error)
    return NextResponse.json(
      { error: 'We could not save that just now. Please try again shortly.' },
      { status: 503 },
    )
  }
}
