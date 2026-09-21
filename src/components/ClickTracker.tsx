'use client'

import { useEffect } from 'react'
import { track, type ClickKind, type ClickRegion } from '@/lib/track-event'

/** A runaway loop or a bot poking the page must not turn into thousands of writes. */
const MAX_CLICKS_PER_PAGE_LOAD = 100

const CONTROL = 'button, a[href], [role="button"], [role="menuitem"], [role="option"], input[type="submit"], input[type="button"]'

/**
 * Dynamic routes collapse to one label — a click on any of 1,300 place cards
 * is "/places/:slug", not 1,300 rows.
 */
const ROUTE_TEMPLATES: [RegExp, string][] = [
  [/^\/places\/category\/[^/]+\/page\/[^/]+$/, '/places/category/:type/page/:n'],
  [/^\/places\/category\/[^/]+$/, '/places/category/:type'],
  [/^\/places\/[^/]+$/, '/places/:slug'],
  [/^\/cities\/[^/]+\/[^/]+$/, '/cities/:city/:type'],
  [/^\/cities\/[^/]+$/, '/cities/:city'],
  [/^\/hotels\/[^/]+$/, '/hotels/:slug'],
]

function templateFor(pathname: string): string {
  return ROUTE_TEMPLATES.find(([pattern]) => pattern.test(pathname))?.[1] ?? pathname
}

function regionOf(element: Element): ClickRegion {
  if (element.closest('[role="dialog"], dialog')) return 'dialog'
  if (element.closest('header')) return 'header'
  if (element.closest('footer')) return 'footer'
  return 'page'
}

const collapse = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

/**
 * Names a control. `data-track` wins — it is how a control opts into a stable
 * name — otherwise the name is derived. Links are named by where they go, not
 * by their text, so a place card is never labelled with the place.
 */
function describe(control: Element, region: ClickRegion): { kind: ClickKind; label: string } | null {
  const explicit = collapse(control.closest('[data-track]')?.getAttribute('data-track'))

  if (control instanceof HTMLAnchorElement) {
    if (explicit) return { kind: 'link', label: explicit }
    let url: URL
    try {
      url = new URL(control.href, window.location.href)
    } catch {
      return null
    }
    if (url.origin !== window.location.origin) return { kind: 'link', label: `→ ${url.hostname}` }
    // The header and footer hold a small fixed set of links, so name them
    // exactly; elsewhere the destination is collapsed to its route.
    const fixed = region === 'header' || region === 'footer'
    return { kind: 'link', label: `→ ${fixed ? url.pathname : templateFor(url.pathname)}` }
  }

  const text = explicit || collapse(control.getAttribute('aria-label')) || collapse(control.textContent) || collapse(control.getAttribute('title'))
  // A typed value or an email address is not a button name; never store one.
  if (!text || text.includes('@')) return { kind: 'button', label: '(unlabelled button)' }
  // "Resend in 27s" and "Show more (12)" are one button, not thirty.
  return { kind: 'button', label: text.replace(/\d+/g, '#').slice(0, 50) }
}

/**
 * Reports which buttons and links people press. One delegated listener for
 * the whole site, so components need no wiring; a control opts into a stable
 * name with `data-track="…"` (do this whenever its text or aria-label varies
 * with state or contains a place name).
 */
export default function ClickTracker() {
  useEffect(() => {
    let sent = 0

    function onClick(event: MouseEvent) {
      if (sent >= MAX_CLICKS_PER_PAGE_LOAD) return
      if (!(event.target instanceof Element)) return
      if (window.location.pathname.startsWith('/analytics')) return

      const control = event.target.closest(CONTROL)
      if (!control) return

      const region = regionOf(control)
      const described = describe(control, region)
      if (!described) return

      sent += 1
      track({ type: 'click', ...described, region, path: window.location.pathname })
    }

    // Capture phase: handlers that stopPropagation (SaveButton does) would
    // otherwise hide the click from a bubbling listener.
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  return null
}
