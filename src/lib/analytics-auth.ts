import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ANALYTICS_COOKIE = 'ap_analytics'

/** Override in production with the ANALYTICS_PASSWORD env var. */
function password(): string {
  return process.env.ANALYTICS_PASSWORD || 'test123'
}

/** The cookie holds a hash of the password, so changing the password logs everyone out. */
export function sessionToken(): string {
  return createHash('sha256').update(`allparx-analytics:${password()}`).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, password())
}

export async function isAnalyticsAuthed(): Promise<boolean> {
  const value = (await cookies()).get(ANALYTICS_COOKIE)?.value
  return !!value && safeEqual(value, sessionToken())
}
