import { redirect } from 'next/navigation'
import { DEAD_URL_DESTINATION } from '@/lib/dead-url'

/**
 * Catch-all for every URL no other route claims — /contact, /about, old
 * WordPress paths, scanner probes. Static routes always win over this one, so
 * it only ever sees URLs that would otherwise 404.
 *
 * Temporary (307) rather than permanent: these URLs may become real pages
 * later, and a 308 would be cached by browsers and crawlers.
 */
export default function UnmatchedPage(): never {
  redirect(DEAD_URL_DESTINATION)
}
