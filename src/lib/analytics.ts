import 'server-only'
import type { NextRequest } from 'next/server'
import { geolocation, ipAddress } from '@vercel/functions'
import { db } from './firebase-admin'
import type { ClientSignals } from './human-signals'

const SETTINGS_REF = db.collection('analytics').doc('settings')
/**
 * Counts only visits the browser beacon has proven human. The old
 * `visitCounter` kept climbing on datacenter traffic, so it is left alone as a
 * raw-request figure instead of being rewritten.
 */
export const PEOPLE_COUNTER_REF = db.collection('analytics').doc('peopleCounter')
export const VISITS_COLLECTION = db.collection('analytics_visits')

/** Telegram pings on every Nth verified visitor (see app/api/pageview). Editable from the /analytics dashboard; 0 turns pings off. */
export const DEFAULT_NOTIFY_EVERY = 10
export const MAX_NOTIFY_EVERY = 1_000_000

/** Accepts only a whole number from 0 to MAX_NOTIFY_EVERY; anything else means "not set". */
export function parseNotifyEvery(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_NOTIFY_EVERY ? n : null
}

export async function getNotifyEvery(): Promise<number> {
  const doc = await SETTINGS_REF.get()
  return parseNotifyEvery(doc.data()?.notifyEvery) ?? DEFAULT_NOTIFY_EVERY
}

export async function setNotifyEvery(every: number): Promise<void> {
  await SETTINGS_REF.set({ notifyEvery: every, updatedAt: new Date().toISOString() }, { merge: true })
}

/**
 * Set from the /analytics dashboard (see actions.ts) to stop tracking the
 * person viewing the dashboard. Without this, browsing your own site inflates
 * every metric — sessions, bounce rate, "new visitors" — with traffic that
 * isn't a real visitor.
 */
export const IGNORE_COOKIE = 'ap_ignore'

/** Set by the proxy on every page view; also how /api/track knows a real browser sent an event. */
export const VISITOR_COOKIE = 'ap_vid'
export const SESSION_COOKIE = 'ap_sid'

export type DeviceType = 'Mobile' | 'Tablet' | 'Desktop'

/** One stored page view. Written by trackVisit, read by the /analytics dashboard. */
export interface VisitRecord {
  ts: Date
  path: string
  query: string | null
  searchQuery: string | null
  host: string | null
  referrer: string | null
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  visitorId: string | null
  sessionId: string | null
  newVisitor: boolean
  newSession: boolean
  device: DeviceType
  browser: string
  os: string
  bot: boolean
  language: string | null
  country: string | null
  countryRegion: string | null
  city: string | null
  flag: string | null
  postalCode: string | null
  latitude: string | null
  longitude: string | null
  edgeRegion: string | null
  ip: string | null
  userAgent: string | null
  /** Which crawler this was, when `bot` is true — see `botName`. Null for real visits. */
  botName: string | null
  /**
   * Whether the browser beacon proved a browser was actually running.
   * `null` means the question was never asked: either the hit predates the
   * beacon (2026-11) or JavaScript never executed. The dashboard treats null
   * as "unverified" and falls back to the IP reputation check in that case.
   */
  human: boolean | null
  /** Why `human` came out the way it did, e.g. "webdriver", "no-screen". */
  humanReason: string | null
  /** Everything the beacon measured, kept so the rules can be retuned later. */
  client: ClientSignals | null
}

/** Signals a real browser produces together and a scraper usually cannot. */
export type { ClientSignals } from './human-signals'


export interface VisitContext {
  visitorId: string
  sessionId: string
  newVisitor: boolean
  newSession: boolean
  /**
   * Chosen by the proxy, not by Firestore, so the browser beacon can find the
   * document without a query: the id is handed to the page in HIT_COOKIE.
   */
  hitId: string
}

export function deviceType(userAgent: string): DeviceType {
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) return 'Tablet'
  if (/Mobi|iPhone|Android/i.test(userAgent)) return 'Mobile'
  return 'Desktop'
}

function browserName(ua: string): string {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/FxiOS|Firefox\//.test(ua)) return 'Firefox'
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Other'
}

function osName(ua: string): string {
  if (/Windows/.test(ua)) return 'Windows'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Other'
}

/**
 * Catches crawlers whose UA carries none of the generic tokens above —
 * verified against a day of real traffic (see the analytics chat thread):
 * GoogleOther and Google-InspectionTool are Google's own auxiliary crawlers,
 * DarkVisitor is an AI-training crawler, and Meta's fetcher identifies itself
 * as "meta-externalagent", not "...bot".
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|scrape|preview|fetch|curl|wget|python|axios|node-fetch|go-http|java\/|headless|lighthouse|pingdom|uptime|monitor|facebookexternalhit|embedly|whatsapp|vercel|googleother|google-inspectiontool|darkvisitor|externalagent/i

/**
 * Google's published Googlebot/GoogleOther range (see
 * https://developers.google.com/search/apis/ipranges/googlebot.json). Some
 * of Google's crawlers carry a UA with no bot-like token at all, so this
 * catches those on IP alone — real traffic never legitimately originates
 * from this block.
 */
function isGooglebotIp(ip: string | null): boolean {
  if (!ip) return false
  const match = /^66\.249\.(\d+)\./.exec(ip)
  if (!match) return false
  const secondOctet = Number(match[1])
  return secondOctet >= 64 && secondOctet <= 95
}

/**
 * Scrapers reuse one stale Chrome build for months. Chrome 100 shipped in
 * March 2022 and browsers auto-update, so a "person" on anything older is
 * almost always automation — a day of traffic had ~110 such hits, each with
 * its own fresh cookie, which inflated "unique visitors".
 */
const OLDEST_PLAUSIBLE_CHROME = 100

function isStaleChrome(ua: string): boolean {
  const major = /Chrome\/(\d+)\./.exec(ua)?.[1]
  return major !== undefined && Number(major) < OLDEST_PLAUSIBLE_CHROME
}

export function isBot(ua: string, ip: string | null): boolean {
  return !ua || BOT_PATTERN.test(ua) || isGooglebotIp(ip) || isStaleChrome(ua)
}

/**
 * Groups a bot hit under a named crawler instead of its raw user agent, so
 * the dashboard's bot breakdown stays a short, readable list (crawl-budget
 * and indexing checks) instead of hundreds of near-duplicate UA strings.
 */
function botName(ua: string, ip: string | null): string {
  if (!ua) return 'No user agent'
  if (isGooglebotIp(ip) || /googlebot|google-inspectiontool|googleother/i.test(ua)) return 'Google'
  if (/bingbot|bingpreview/i.test(ua)) return 'Bing'
  if (/gptbot|oai-searchbot|chatgpt-user/i.test(ua)) return 'OpenAI'
  if (/claudebot|claude-web/i.test(ua)) return 'Anthropic'
  if (/bytespider/i.test(ua)) return 'ByteDance'
  if (/ahrefsbot/i.test(ua)) return 'Ahrefs'
  if (/semrushbot/i.test(ua)) return 'Semrush'
  if (/facebookexternalhit|meta-externalagent/i.test(ua)) return 'Meta'
  if (/darkvisitor/i.test(ua)) return 'DarkVisitor'
  if (/perplexitybot|perplexity/i.test(ua)) return 'Perplexity'
  if (isStaleChrome(ua)) return 'Stale Chrome (likely scraper)'
  return 'Other bot'
}

/**
 * Requests for files rather than pages: the search index the search box
 * downloads, ads.txt, the hero video, generated icons. They pass through the
 * proxy like everything else but are not page views, and counting them made
 * /search-index.json the "top page" and inflated every total.
 */
const ASSET_PATH = /\.(?:json|txt|xml|mp4|webm|jpe?g|png|gif|svg|webp|avif|ico|js|css|map|woff2?)$|^\/(?:icon|apple-icon|opengraph-image)$/i

export function isAssetPath(pathname: string): boolean {
  return ASSET_PATH.test(pathname)
}

function hostOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[analytics] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing — skipping notification')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
    if (!response.ok) {
      console.warn('[analytics] Telegram API error', response.status, await response.text())
    }
  } catch (error) {
    console.warn('[analytics] failed to reach Telegram', error)
  }
}

/**
 * The "visitor #N" ping. Sent from the browser beacon's endpoint once a visit
 * has been proven human, so the pings themselves are no longer triggered by
 * datacenter traffic — that was most of them.
 */
export async function notifyPersonVisit(
  visit: Pick<VisitRecord, 'path' | 'device' | 'city' | 'countryRegion' | 'country' | 'flag' | 'referrer' | 'ip' | 'userAgent'>,
  count: number,
): Promise<void> {
  const location = [visit.city, visit.countryRegion, visit.country].filter(Boolean).join(', ') || 'Unknown'
  const page = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://allparx.com'}${visit.path}`
  const lines = [
    `<b>allparx.com</b> — visitor #${count}`,
    `Page: ${escapeHtml(page)}`,
    `Device: ${visit.device}`,
    `Location: ${escapeHtml(location)}${visit.flag ? ` ${visit.flag}` : ''}`,
    `Referrer: ${escapeHtml(visit.referrer ?? 'Direct / none')}`,
    `IP: ${escapeHtml(visit.ip ?? 'Unknown')}`,
    `User agent: ${escapeHtml(visit.userAgent ?? 'Unknown')}`,
  ]
  await sendTelegramMessage(lines.join('\n'))
}

function buildVisitRecord(request: NextRequest, context: VisitContext): VisitRecord {
  const userAgent = request.headers.get('user-agent') ?? ''
  const referrer = request.headers.get('referer')
  const referrerHost = hostOf(referrer)
  const ownHost = request.nextUrl.hostname.replace(/^www\./, '')
  const geo = geolocation(request)
  const params = request.nextUrl.searchParams
  const decode = (value: string | undefined) => (value ? decodeURIComponent(value) : null)
  const ip = ipAddress(request) ?? null
  const bot = isBot(userAgent, ip)

  return {
    ts: new Date(),
    path: request.nextUrl.pathname,
    query: request.nextUrl.search || null,
    searchQuery: request.nextUrl.pathname === '/search' ? params.get('q')?.trim() || null : null,
    host: request.nextUrl.hostname,
    referrer,
    // Internal navigation is not a traffic source.
    referrerHost: referrerHost && referrerHost !== ownHost ? referrerHost : null,
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    visitorId: context.visitorId,
    sessionId: context.sessionId,
    newVisitor: context.newVisitor,
    newSession: context.newSession,
    device: deviceType(userAgent),
    browser: browserName(userAgent),
    os: osName(userAgent),
    bot,
    botName: bot ? botName(userAgent, ip) : null,
    language: request.headers.get('accept-language')?.split(',')[0]?.trim() || null,
    country: geo.country ?? null,
    countryRegion: geo.countryRegion ?? null,
    city: decode(geo.city),
    flag: geo.flag ?? null,
    postalCode: geo.postalCode ?? null,
    latitude: geo.latitude ?? null,
    longitude: geo.longitude ?? null,
    edgeRegion: geo.region ?? null,
    ip,
    userAgent: userAgent || null,
    human: null,
    humanReason: null,
    client: null,
  }
}

/**
 * Stores the page view for the /analytics dashboard. Runs from Proxy on every
 * page hit (see src/proxy.ts for the matcher that filters out prefetches,
 * assets, and API routes).
 *
 * Nothing is counted or announced here any more. This write only records that
 * a request happened; whether it was a person is decided later, when the
 * browser beacon calls /api/pageview. That split is the whole point: a request
 * alone (which is all a scraper makes) is no longer evidence of a visitor.
 * Bots are stored too, for crawl-budget visibility.
 */
export async function trackVisit(request: NextRequest, context: VisitContext): Promise<void> {
  const visit = buildVisitRecord(request, context)
  await VISITS_COLLECTION.doc(context.hitId).set(visit)
}

/** Set by trackVisit's caller with the id of the document it wrote, so the browser beacon can stamp it. */
export const HIT_COOKIE = 'ap_hit'
