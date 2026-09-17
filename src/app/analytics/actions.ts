'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ANALYTICS_COOKIE, checkPassword, sessionToken } from '@/lib/analytics-auth'

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
