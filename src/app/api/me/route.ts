import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ensureProfile, listSavedSlugs } from '@/lib/account'
import { requestUser } from '@/lib/auth/request-user'

/**
 * The one call the app makes on load once someone is signed in: who they are,
 * and which places they have saved.
 *
 * The saved map comes back whole rather than per place, because the alternative
 * is one request per card on a grid of 48.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await requestUser(request)
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const [profile, saved] = await Promise.all([
    ensureProfile(user.uid, user.email),
    listSavedSlugs(user.uid),
  ])

  return NextResponse.json(
    { profile: { ...profile, savedCount: Object.keys(saved).length }, saved },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
