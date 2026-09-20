import 'server-only'
import { db } from './firebase-admin'
import { getHotel } from './hotels'

/**
 * Stay enquiries submitted from a hotel page.
 *
 * An enquiry is a *request to be contacted*, not a reservation: AllParx holds
 * no inventory and takes no payment, so nothing here may be written or
 * rendered as though a room has been held. The form copy and
 * `AFFILIATION_NOTICE` both say so, and this module deliberately has no
 * concept of confirming anything.
 *
 * Personal data lands in one Firestore collection with a fixed shape. Keep it
 * to what a human needs in order to reply — there is no payment detail, no
 * passport number and no free-text field that invites either.
 */
export const ENQUIRIES = db.collection('stay_enquiries')

export type StayEnquiry = {
  hotelSlug: string
  hotelName: string
  name: string
  email: string
  /** ISO dates (YYYY-MM-DD), or null when the traveller is still deciding. */
  checkIn: string | null
  checkOut: string | null
  adults: number
  children: number
  notes: string | null
  createdAt: Date
  /** Coarse request context, for spotting abuse — no full IP is stored. */
  country: string | null
  userAgent: string | null
}

export type EnquiryInput = {
  hotelSlug?: unknown
  name?: unknown
  email?: unknown
  checkIn?: unknown
  checkOut?: unknown
  adults?: unknown
  children?: unknown
  notes?: unknown
  /** Hidden field. Real browsers leave it empty; bots fill everything in. */
  company?: unknown
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
// Deliberately loose: the only real test of an address is sending mail to it,
// and over-strict patterns reject valid addresses more often than they catch
// bad ones.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function count(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(n) || n < min || n > max) return fallback
  return n
}

function isoDate(value: unknown): string | null {
  const raw = text(value, 10)
  if (!ISO_DATE.test(raw)) return null
  const parsed = new Date(`${raw}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : raw
}

export type ValidationResult =
  | { ok: true; enquiry: Omit<StayEnquiry, 'createdAt' | 'country' | 'userAgent'> }
  | { ok: false; error: string }

/**
 * Validates and normalises a submission. Returns the reason on failure so the
 * form can say which field to fix, rather than failing silently.
 */
export function validateEnquiry(input: EnquiryInput): ValidationResult {
  // The honeypot is checked first so a bot never learns which field it got
  // wrong; it gets the same generic rejection whatever else it sent.
  if (text(input.company, 100) !== '') return { ok: false, error: 'Could not accept this form.' }

  const hotelSlug = text(input.hotelSlug, 80)
  const hotel = getHotel(hotelSlug)
  if (!hotel) return { ok: false, error: 'Unknown hotel.' }

  const name = text(input.name, 120)
  if (name.length < 2) return { ok: false, error: 'Please give a name we can reply to.' }

  const email = text(input.email, 200)
  if (!EMAIL.test(email)) return { ok: false, error: 'That email address does not look right.' }

  const checkIn = isoDate(input.checkIn)
  const checkOut = isoDate(input.checkOut)
  if (checkIn && checkOut && checkOut <= checkIn) {
    return { ok: false, error: 'Check-out needs to be after check-in.' }
  }

  return {
    ok: true,
    enquiry: {
      hotelSlug,
      hotelName: hotel.name,
      name,
      email,
      checkIn,
      checkOut,
      adults: count(input.adults, 1, 20, 2),
      children: count(input.children, 0, 20, 0),
      notes: text(input.notes, 2000) || null,
    },
  }
}

export async function saveEnquiry(enquiry: StayEnquiry): Promise<string> {
  const doc = await ENQUIRIES.add(enquiry)
  return doc.id
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Pings Telegram so an enquiry is seen the same day. Best-effort: a failure
 * here must never fail the submission, because the enquiry is already saved.
 */
export async function notifyEnquiry(enquiry: StayEnquiry, id: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[enquiry] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing — skipping notification')
    return
  }

  const dates =
    enquiry.checkIn && enquiry.checkOut
      ? `${enquiry.checkIn} → ${enquiry.checkOut}`
      : 'dates not fixed'
  const party = `${enquiry.adults} adult${enquiry.adults === 1 ? '' : 's'}${
    enquiry.children > 0 ? `, ${enquiry.children} child${enquiry.children === 1 ? '' : 'ren'}` : ''
  }`

  const lines = [
    `🏨 <b>Stay enquiry</b> — ${escapeHtml(enquiry.hotelName)}`,
    `${escapeHtml(enquiry.name)} · ${escapeHtml(enquiry.email)}`,
    `${escapeHtml(dates)} · ${escapeHtml(party)}`,
    enquiry.country ? `From ${escapeHtml(enquiry.country)}` : null,
    enquiry.notes ? `\n${escapeHtml(enquiry.notes.slice(0, 500))}` : null,
    `\n<code>${escapeHtml(id)}</code>`,
  ].filter(Boolean)

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    if (!response.ok) {
      console.warn('[enquiry] Telegram API error', response.status, await response.text())
    }
  } catch (error) {
    console.warn('[enquiry] failed to reach Telegram', error)
  }
}
