/**
 * Browser-only page-view beacon.
 *
 * The proxy records that a request happened. This is the second half: a small
 * script that runs in the page and tells the server, for that exact hit,
 * whether a real browser rendered it. A crawler that never executes
 * JavaScript leaves its hit unverified, which is now the difference between
 * "someone visited" and "something fetched a URL".
 *
 * Nothing personal is collected: screen size, timezone name, language list and
 * a WebGL renderer string. No cookies are read here except the hit id the
 * proxy just set, no fingerprint is stored, and the whole payload is under 1KB.
 */

/** What the server stores in `client` on the visit document. */
export type ClientSignals = {
  screenW: number | null
  screenH: number | null
  viewportW: number | null
  viewportH: number | null
  timezone: string | null
  tzOffset: number | null
  languages: string | null
  webdriver: boolean
  hardwareConcurrency: number | null
  touch: boolean
  webgl: string | null
}

function webglRenderer(): string | null {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return null
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    if (!info) return 'no-debug-info'
    const renderer = gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
    return typeof renderer === 'string' ? renderer.slice(0, 120) : null
  } catch {
    return null
  }
}

export function collectSignals(): ClientSignals {
  const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null)
  const tzOffset = (() => {
    try {
      // getTimezoneOffset() counts minutes *behind* UTC (Los Angeles = 480).
      // Flip it so positive means east, matching every other offset on the site.
      return -new Date().getTimezoneOffset()
    } catch {
      return null
    }
  })()

  return {
    screenW: number(window.screen?.width),
    screenH: number(window.screen?.height),
    viewportW: number(window.innerWidth),
    viewportH: number(window.innerHeight),
    timezone: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null
      } catch {
        return null
      }
    })(),
    tzOffset,
    languages: (() => {
      try {
        const list = navigator.languages?.length ? navigator.languages : [navigator.language]
        return list.filter(Boolean).slice(0, 3).join(',') || null
      } catch {
        return null
      }
    })(),
    webdriver: (() => {
      try {
        return navigator.webdriver === true
      } catch {
        return true
      }
    })(),
    hardwareConcurrency: number(navigator.hardwareConcurrency),
    touch: (() => {
      try {
        return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0
      } catch {
        return false
      }
    })(),
    webgl: webglRenderer(),
  }
}

/**
 * Decides whether a hit with these signals counts as a person. Kept on the
 * server so a browser cannot simply declare itself human; the signals are
 * cheap to produce honestly and awkward to fake together.
 */
export function judgeSignals(
  signals: ClientSignals,
): { human: boolean; reason: string | null } {
  if (signals.webdriver) return { human: false, reason: 'webdriver' }
  if (!signals.screenW || !signals.screenH || signals.screenW < 320 || signals.screenH < 320) {
    return { human: false, reason: 'no-screen' }
  }
  if (!signals.languages) return { human: false, reason: 'no-languages' }
  if (!signals.timezone) return { human: false, reason: 'no-timezone' }
  return { human: true, reason: null }
}

/** Keeps a hostile payload from writing junk into Firestore. */
export function parseSignals(input: unknown): ClientSignals | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const num = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    const rounded = Math.round(value)
    return Math.abs(rounded) > 100_000 ? null : rounded
  }
  const str = (value: unknown, max = 120) =>
    typeof value === 'string' && value.length > 0 ? value.slice(0, max) : null

  const signals: ClientSignals = {
    screenW: num(raw.screenW),
    screenH: num(raw.screenH),
    viewportW: num(raw.viewportW),
    viewportH: num(raw.viewportH),
    timezone: str(raw.timezone, 64),
    tzOffset: num(raw.tzOffset),
    languages: str(raw.languages, 80),
    webdriver: raw.webdriver === true,
    hardwareConcurrency: num(raw.hardwareConcurrency),
    touch: raw.touch === true,
    webgl: str(raw.webgl),
  }

  // A screen of 0x0 or a tzOffset of 99 hours is not a browser, it is garbage.
  if (signals.tzOffset !== null && Math.abs(signals.tzOffset) > 14 * 60) signals.tzOffset = null
  return signals
}
