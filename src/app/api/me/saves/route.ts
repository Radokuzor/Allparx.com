import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { VISITED, WISHLIST, listSaves, setNote, toggleSave } from '@/lib/account'
import { requestUser } from '@/lib/auth/request-user'

/**
 * Saved places: the full list for the saved page, and the toggle behind every
 * heart on the site.
 */
export const dynamic = 'force-dynamic'

const ALLOWED_LISTS = new Set([WISHLIST, VISITED])

export async function GET(request: NextRequest) {
  const user = await requestUser(request)
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  return NextResponse.json(
    { places: await listSaves(user.uid) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: NextRequest) {
  const user = await requestUser(request)
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const { slug, list } = (body ?? {}) as { slug?: unknown; list?: unknown }
  if (typeof slug !== 'string' || !/^[a-z0-9-]{1,120}$/.test(slug)) {
    return NextResponse.json({ error: 'Unknown place.' }, { status: 400 })
  }

  const target = typeof list === 'string' && ALLOWED_LISTS.has(list) ? list : WISHLIST
  const result = await toggleSave(user.uid, slug, target)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return NextResponse.json(
    { ok: true, saved: result.saved, place: result.place },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function PATCH(request: NextRequest) {
  const user = await requestUser(request)
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const { slug, note } = (body ?? {}) as { slug?: unknown; note?: unknown }
  if (typeof slug !== 'string') {
    return NextResponse.json({ error: 'Unknown place.' }, { status: 400 })
  }

  const updated = await setNote(user.uid, slug, typeof note === 'string' ? note : null)
  if (!updated) return NextResponse.json({ error: 'That place is not saved.' }, { status: 404 })

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
