'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ANALYTICS_COOKIE, checkPassword, sessionToken } from '@/lib/analytics-auth'
import { IGNORE_COOKIE } from '@/lib/analytics'

export async function login(formData: FormData) {
  const candidate = String(formData.get('password') ?? '')
  if (!checkPassword(candidate)) redirect('/analytics?error=1')

  ;(await cookies()).set(ANALYTICS_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/analytics',
    maxAge: 60 * 60 * 24 * 30,
  })
  redirect('/analytics')
}

export async function logout() {
  ;(await cookies()).delete({ name: ANALYTICS_COOKIE, path: '/analytics' })
  redirect('/analytics')
}

/** Toggles whether the current browser's page views are tracked at all. */
export async function setSelfExclusion(formData: FormData) {
  const enable = formData.get('enable') === '1'
  const store = await cookies()

  if (enable) {
    store.set(IGNORE_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // Applies site-wide — proxy.ts checks it on every page, not just /analytics.
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 2,
    })
  } else {
    store.delete({ name: IGNORE_COOKIE, path: '/' })
  }
  redirect('/analytics')
}
