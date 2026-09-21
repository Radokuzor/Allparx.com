'use client'

import { useEffect } from 'react'
import { REDIRECT_MARKER } from '@/lib/dead-url'

/**
 * Dead URLs redirect to `/?ap_r=1` (see lib/dead-url.ts) so analytics can tell
 * the redirect from a real visit. Once the page has loaded, drop the marker so
 * the address bar, bookmarks and shares show a plain `/`.
 */
export default function TidyUrl() {
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(REDIRECT_MARKER)) return
    url.searchParams.delete(REDIRECT_MARKER)
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [])

  return null
}
