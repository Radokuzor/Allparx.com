/**
 * Throwaway-inbox domains, rejected at sign-up.
 *
 * The point is data quality, not security: a code still has to be received, so
 * anyone determined can route around this with a domain we have not listed.
 * What it does buy is that the saved-place data stays made of addresses that
 * will still exist next month.
 *
 * Keep this short and obvious rather than exhaustive — a big imported list
 * eventually blocks a real person, and that costs more than a junk row.
 */
const DISPOSABLE_DOMAINS = new Set([
  '0-mail.com',
  '10minutemail.com',
  '20minutemail.com',
  'burnermail.io',
  'dispostable.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'guerrillamail.net',
  'inboxbear.com',
  'maildrop.cc',
  'mailinator.com',
  'mintemail.com',
  'moakt.com',
  'mohmal.com',
  'sharklasers.com',
  'spam4.me',
  'temp-mail.io',
  'temp-mail.org',
  'tempmail.com',
  'tempmailo.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
  'yopmail.net',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return !!domain && DISPOSABLE_DOMAINS.has(domain)
}

/**
 * Deliberately permissive: the code we send is the real check on whether an
 * address works, so this only needs to catch typing mistakes and obvious junk.
 */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const email = input.trim().toLowerCase()
  if (email.length < 6 || email.length > 254) return null
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return null
  return email
}
