import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRecord } from 'firebase-admin/auth'
import admin from '@/lib/firebase-admin'
import { CODE_LENGTH, verifyCode } from '@/lib/auth/codes'
import { normalizeEmail } from '@/lib/auth/disposable'
import { ensureProfile } from '@/lib/account'

/**
 * Step two: trade a correct code for a Firebase custom token.
 *
 * The account is created here, on first correct code, rather than when the
 * code was requested — so an address that never confirms never becomes a user
 * record. That is the whole answer to junk sign-ups: there is no such thing as
 * an unverified account in this system.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const payload = (body ?? {}) as { email?: unknown; code?: unknown }
  const email = normalizeEmail(payload.email)
  const code = typeof payload.code === 'string' ? payload.code.replace(/\D/g, '') : ''

  if (!email || code.length !== CODE_LENGTH) {
    return NextResponse.json({ error: 'Enter the 6-digit code from your email.' }, { status: 400 })
  }

  const result = await verifyCode(email, code)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  const auth = admin.auth()
  let user: UserRecord
  try {
    user = await auth.getUserByEmail(email)
    // An account made through Google carries a verified address already; this
    // only matters for records created before this flow existed.
    if (!user.emailVerified) {
      await auth.updateUser(user.uid, { emailVerified: true })
    }
  } catch {
    user = await auth.createUser({ email, emailVerified: true })
  }

  const token = await auth.createCustomToken(user.uid)
  await ensureProfile(user.uid, email, {
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
  })

  return NextResponse.json(
    { ok: true, token },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
