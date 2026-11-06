import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { db } from './firebase-admin'
import { getPlace } from './firestore'
import { sendEmail } from './auth/email'
import { SITE_NAME, SITE_URL } from './site'

/**
 * "Send me a local guide for <place>" — collected from the block that sits in
 * the middle of a place article.
 *
 * What this is: an email address, the place the reader was reading about, and
 * permission to send them a guide for it. What it is not: an account. Nothing
 * here creates a user, and nothing is sent except the welcome email below until
 * a guide for that place actually exists.
 *
 * A repeat submission for the same address and place resolves to the same
 * document, so pressing the button twice cannot produce two welcome emails.
 */

export const REQUESTS = db.collection('guide_requests')

export const CONSENT_TEXT =
  'Send me email from AllParx about local guides and new places. I can unsubscribe at any time.'

export type GuideRequest = {
  email: string
  placeSlug: string
  placeName: string
  city: string | null
  state: string | null
  /** Path the block was on, so a page test can be told apart from an article. */
  path: string
  consentText: string
  createdAt: Date
  /** Coarse context for spotting abuse. No IP is stored. */
  country: string | null
  userAgent: string | null
  unsubscribeToken: string
  welcomeSentAt: Date | null
  unsubscribedAt: Date | null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Fastest a human plausibly reads the block and submits. */
const MIN_ELAPSED_MS = 800

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export type ValidationResult =
  | {
      ok: true
      email: string
      placeSlug: string
      path: string
      elapsedMs: number
    }
  | { ok: false; error: string }

/**
 * Validates a submission. The hidden `company` field and the elapsed time are
 * both checked because either one alone is trivially defeated; a bot that fills
 * every input still has to look like it waited.
 */
export function validateRequest(input: Record<string, unknown>): ValidationResult {
  if (text(input.company, 40)) return { ok: false, error: 'Rejected.' }

  const email = text(input.email, 254).toLowerCase()
  if (!email) return { ok: false, error: 'Enter your email so we can send the guide.' }
  if (!EMAIL.test(email)) return { ok: false, error: 'That email address does not look right.' }

  const placeSlug = text(input.placeSlug, 160)
  if (!placeSlug) return { ok: false, error: 'Missing place.' }

  const elapsed = Number(input.elapsedMs)
  const elapsedMs = Number.isFinite(elapsed) ? Math.max(0, Math.min(elapsed, 3_600_000)) : 0
  if (elapsedMs > 0 && elapsedMs < MIN_ELAPSED_MS) return { ok: false, error: 'Rejected.' }

  const path = text(input.path, 200) || `/places/${placeSlug}`

  return { ok: true, email, placeSlug, path, elapsedMs }
}

function docId(email: string, placeSlug: string): string {
  return createHash('sha1').update(`${email}|${placeSlug}`).digest('hex').slice(0, 32)
}

export type SubmitResult =
  | { ok: true; id: string; alreadySubscribed: boolean }
  | { ok: false; error: string }

export async function submitGuideRequest(input: {
  email: string
  placeSlug: string
  path: string
  country: string | null
  userAgent: string | null
}): Promise<SubmitResult> {
  const place = await getPlace(input.placeSlug)
  if (!place) return { ok: false, error: 'We could not find that place.' }

  const id = docId(input.email, input.placeSlug)
  const ref = REQUESTS.doc(id)
  const existing = await ref.get()

  if (existing.exists) {
    const data = existing.data() as Partial<GuideRequest> | undefined
    // Someone who unsubscribed and comes back through the form has asked again,
    // so the request is honoured rather than silently swallowed.
    if (data?.unsubscribedAt) {
      await ref.set({ unsubscribedAt: null }, { merge: true })
    }
    return { ok: true, id, alreadySubscribed: true }
  }

  const request: GuideRequest = {
    email: input.email,
    placeSlug: place.slug,
    placeName: place.name,
    city: place.city ?? null,
    state: place.state ?? null,
    path: input.path,
    consentText: CONSENT_TEXT,
    createdAt: new Date(),
    country: input.country,
    userAgent: input.userAgent,
    unsubscribeToken: randomBytes(18).toString('base64url'),
    welcomeSentAt: null,
    unsubscribedAt: null,
  }

  // Written before the email goes out: an address we cannot send to is still a
  // person who asked, and losing the record would lose the follow-up.
  await ref.set(request)

  await sendWelcome(request)
    .then(() =>
      ref.set({ welcomeSentAt: new Date() }, { merge: true }).catch(() => undefined),
    )
    .catch((error) => console.error('[guide] welcome email failed', id, error))

  await notifyRequest(request, id)

  return { ok: true, id, alreadySubscribed: false }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/guide/unsubscribe?t=${encodeURIComponent(token)}`
}

/** The one email this feature sends. The guide itself comes later. */
export function welcomeEmail(request: GuideRequest): {
  to: string
  subject: string
  text: string
  html: string
} {
  const placeUrl = `${SITE_URL}/places/${request.placeSlug}`
  const where = [request.city, request.state].filter(Boolean).join(', ')
  const placeLabel = where ? `${request.placeName} (${where})` : request.placeName
  const unsubscribe = unsubscribeUrl(request.unsubscribeToken)

  const text = `Welcome to ${SITE_NAME}.

You asked for a local guide to ${placeLabel}, so you are on the list. While it is being written, everything we know about the place is on its page: ${placeUrl}

Here is what an explorer does with AllParx:

- Search any town and see what is within a short drive.
- Save the places you mean to visit so they are waiting next time.
- Open a place page before you go: real hours, parking, warnings and directions.

Your guide for ${request.placeName} is next. Reply to this email if there is something you want in it, like the best time to go or whether it works with kids and a dog.

Go outside,
${SITE_NAME}
${SITE_URL}

You are getting this because you asked for a guide at ${SITE_URL}. Unsubscribe any time: ${unsubscribe}`

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e9ecea;padding:32px;">
          <tr><td style="font-size:15px;font-weight:700;color:#15803d;padding-bottom:22px;">${SITE_NAME}</td></tr>
          <tr><td style="font-size:22px;font-weight:700;color:#111827;padding-bottom:10px;">You are an explorer now</td></tr>
          <tr><td style="font-size:15px;line-height:23px;color:#4b5563;padding-bottom:18px;">
            You asked for a local guide to <strong style="color:#111827;">${escapeHtml(placeLabel)}</strong>, so you are on the list. It is being written now and will land in this inbox.
          </td></tr>
          <tr><td style="font-size:15px;line-height:23px;color:#4b5563;padding-bottom:22px;">
            Until then, everything we know about the place is already on its page.
          </td></tr>
          <tr><td style="padding-bottom:26px;">
            <a href="${placeUrl}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:999px;">Open ${escapeHtml(request.placeName)}</a>
          </td></tr>
          <tr><td style="font-size:15px;font-weight:700;color:#111827;padding-bottom:8px;">Three things worth doing</td></tr>
          <tr><td style="font-size:14px;line-height:22px;color:#4b5563;padding-bottom:18px;">
            Search any town and see what is within a short drive.<br>
            Save the places you mean to visit, so they are waiting next time.<br>
            Read a place page before you go: hours, parking, warnings, directions.
          </td></tr>
          <tr><td style="font-size:15px;line-height:23px;color:#4b5563;padding-bottom:22px;">
            Reply to this email if there is something you want in the guide, like the best time to go, or whether it works with kids and a dog.
          </td></tr>
          <tr><td style="font-size:15px;font-weight:700;color:#111827;padding-bottom:4px;">Go outside,</td></tr>
          <tr><td style="font-size:15px;color:#4b5563;padding-bottom:24px;">${SITE_NAME}</td></tr>
          <tr><td style="font-size:12px;line-height:19px;color:#9ca3af;border-top:1px solid #eef0f4;padding-top:16px;">
            You are getting this because you asked for a guide at <a href="${SITE_URL}" style="color:#9ca3af;">${SITE_URL}</a>.
            <a href="${unsubscribe}" style="color:#6b7280;">Unsubscribe</a> any time.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  return {
    to: request.email,
    subject: `Welcome, explorer. Your ${request.placeName} guide is next`,
    text,
    html,
  }
}

async function sendWelcome(request: GuideRequest): Promise<void> {
  await sendEmail(welcomeEmail(request))
}

/** Best-effort ping, so a new address is seen the moment it lands. */
export async function notifyRequest(request: GuideRequest, id: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const where = [request.city, request.state].filter(Boolean).join(', ')
  const lines = [
    `🌲 <b>Guide request</b> — ${escapeHtml(request.placeName)}`,
    where ? `${escapeHtml(where)}` : null,
    `<code>${escapeHtml(request.email)}</code>`,
    request.country ? `From ${escapeHtml(request.country)}` : null,
    `\n<code>${escapeHtml(id)}</code>`,
  ].filter(Boolean)

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
  } catch (error) {
    console.warn('[guide] Telegram notify failed', error)
  }
}
