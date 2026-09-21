/**
 * Client → server analytics events for things a page view can't show: the
 * "Find near me" button being pressed, and what a near-me search found.
 *
 * This file is safe to import from the browser. The server half — validation
 * and storage — is in analytics-events.ts.
 */

export const NEAR_ME_SOURCES = ['floating', 'hero'] as const
export type NearMeSource = (typeof NEAR_ME_SOURCES)[number]

/** How many places we hold near a searched spot — the "supply" side. */
export type Supply = {
  /** Miles to the closest place of any kind. */
  nearest: number | null
  within10: number
  within25: number
  within50: number
  /** Places within 25 miles, by category. */
  byType: Record<string, number>
}

export const CLICK_KINDS = ['button', 'link'] as const
export type ClickKind = (typeof CLICK_KINDS)[number]

/** Which part of the page a control sits in — the same label can mean different things in each. */
export const CLICK_REGIONS = ['header', 'footer', 'dialog', 'page'] as const
export type ClickRegion = (typeof CLICK_REGIONS)[number]

export type TrackPayload =
  | { type: 'click'; kind: ClickKind; label: string; region: ClickRegion; path: string }
  | { type: 'near_me_click'; source: NearMeSource; path: string }
  | {
      type: 'near_me_search'
      method: 'gps' | 'lookup'
      outcome: 'ok'
      /** What the visitor typed. Absent for GPS. */
      query?: string
      /** What it resolved to, e.g. "Austin, TX" or "ZIP 78701". */
      label?: string
      /** Coarsened before it leaves the browser — see coarsen(). */
      lat: number
      lng: number
      supply: Supply
    }
  | { type: 'near_me_search'; method: 'lookup'; outcome: 'not_found'; query: string }
  | {
      type: 'near_me_search'
      method: 'gps'
      outcome: 'gps_failed'
      reason: 'denied' | 'timeout' | 'unavailable' | 'unsupported'
    }

/**
 * One decimal of latitude is ~7 miles: enough to tell Austin from Dallas,
 * nowhere near enough to find a house. Precise GPS never leaves the browser.
 */
export const coarsen = (degrees: number) => Math.round(degrees * 10) / 10

/**
 * Fire-and-forget. sendBeacon survives the page navigating away, which is
 * exactly what happens when the button being tracked is a link.
 */
export function track(payload: TrackPayload): void {
  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) return
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Analytics must never break the page.
  }
}
