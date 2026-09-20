import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ipAddress } from '@vercel/functions'
import { issueCode } from '@/lib/auth/codes'
import { isDisposableEmail, normalizeEmail } from '@/lib/auth/disposable'
import { sendEmail, signInCodeEmail } from '@/lib/auth/email'

/**
 * Step one of signing in: mail a six-digit code to an address.
 *
 * This never says whether the address already has an account. The response is
 * the same either way, because the difference is exactly what someone would
 * use to find out which of a list of addresses is a member here.
 *
 * Rate limiting lives in `issueCode`, next to the state it has to read.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const email = normalizeEmail((body as { email?: unknown })?.email)
  if (!email) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json(
      { error: 'That looks like a temporary inbox. Please use an address you keep.' },
      { status: 400 },
    )
  }

  const issued = await issueCode(email, ipAddress(request) ?? null)
  if (!issued.ok) {
    return NextResponse.json(
      { error: issued.error, retryAfterSeconds: issued.retryAfterSeconds ?? null },
      { status: 429 },
    )
  }

  try {
    await sendEmail(signInCodeEmail(email, issued.code, issued.expiresInMinutes))
  } catch (error) {
    // The code is already reserved, but nobody can read it, so say so plainly
    // rather than parking the person on a screen waiting for mail that failed.
    console.error('[auth] could not send sign-in code', error)
    return NextResponse.json(
      { error: 'We could not send that email just now. Please try again shortly.' },
      { status: 502 },
    )
  }

  return NextResponse.json(
    { ok: true, expiresInMinutes: issued.expiresInMinutes },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
