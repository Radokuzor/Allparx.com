'use client'

import { useEffect } from 'react'
import { collectSignals } from '@/lib/human-signals'

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

/**
 * Tells the server that this page view really was a browser. Rendered once in
 * the root layout; does nothing when the proxy did not leave a hit id, which
 * is the case on /analytics and on any request the proxy ignores.
 *
 * Sent with sendBeacon so it survives an immediate navigation, and wrapped in
 * try/catch so analytics can never break a page.
 */
export default function PageViewBeacon() {
  useEffect(() => {
    const hitId = readCookie('ap_hit')
    if (!hitId) return

    const send = () => {
      try {
        const body = JSON.stringify({ hitId, signals: collectSignals() })
        if (navigator.sendBeacon?.('/api/pageview', new Blob([body], { type: 'application/json' }))) return
        void fetch('/api/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {})
      } catch {
        // Analytics is never allowed to break the page.
      }
    }

    // Wait one frame so the document is actually painted. Headless scrapers
    // that take a screenshot and leave still send it; ones that only fetch
    // HTML never reach this code at all.
    const timer = window.setTimeout(send, 250)
    return () => window.clearTimeout(timer)
  }, [])

  return null
}
