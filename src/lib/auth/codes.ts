import 'server-only'
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { Timestamp } from 'firebase-admin/firestore'
import { db } from '../firebase-admin'

/**
 * Sign-in codes.
 *
 * Firebase Auth has no email-code flow of its own — only magic links — so the
 * code lives here and Firebase only ever sees the result: `verifyCode` proves
 * the person can read the address, and the caller turns that into a Firebase
 * user with a custom token.
 *
 * Three rules make this safe to expose to the open internet:
 *
 *  - Only a hash of the code is stored, salted per-address and peppered with a
 *    server secret, so a leaked database dump cannot be replayed.
 *  - A code dies after MAX_ATTEMPTS guesses, which is what stops someone
 *    walking the million possibilities.
 *  - Sends are throttled per address and per network, so the endpoint cannot
 *    mail-bomb a stranger or burn the sending quota.
 */

const COLLECTION = 'authCodes'
const CODE_TTL_MINUTES = 10
const MAX_ATTEMPTS = 5
/** Long enough that a slow inbox is not a dead end, short enough to be a brake. */
const RESEND_COOLDOWN_SECONDS = 45
const MAX_SENDS_PER_WINDOW = 5
const SEND_WINDOW_MINUTES = 60
const MAX_SENDS_PER_IP = 15

export const CODE_LENGTH = 6
export const RESEND_COOLDOWN = RESEND_COOLDOWN_SECONDS

type CodeDoc = {
  codeHash: string
  expiresAt: Timestamp
  attempts: number
  sendCount: number
  windowStartedAt: Timestamp
  lastSentAt: Timestamp
}

function pepper(): string {
  const secret = process.env.AUTH_OTP_PEPPER
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_OTP_PEPPER is not set. Generate one and add it to the environment.')
  }
  return 'allparx-development-pepper'
}

/**
 * The document id is a hash, not the address, so anyone who can list the
 * collection does not walk away with a mailing list.
 */
function docId(email: string): string {
  return createHash('sha256').update(`allparx-code-id:${email}`).digest('hex')
}

function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${pepper()}:${email}:${code}`).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/** randomInt is rejection-sampled, so every code is equally likely. */
function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(CODE_LENGTH, '0')
}

function secondsSince(moment: Timestamp | undefined, now: Date): number {
  return moment ? (now.getTime() - moment.toDate().getTime()) / 1000 : Number.POSITIVE_INFINITY
}

export type IssueResult =
  | { ok: true; code: string; expiresInMinutes: number }
  | { ok: false; error: string; retryAfterSeconds?: number }

/**
 * Reserves a new code for `email` and returns it for the caller to send.
 *
 * The code comes back rather than being mailed here so a delivery failure can
 * be reported to the person as a delivery failure, instead of leaving a code
 * they never received sitting valid in the database.
 */
export async function issueCode(email: string, ip: string | null): Promise<IssueResult> {
  const now = new Date()

  if (ip && (await ipIsFlooding(ip, now))) {
    return { ok: false, error: 'Too many sign-in attempts from this network. Try again later.' }
  }

  const ref = db.collection(COLLECTION).doc(docId(email))
  const existing = (await ref.get()).data() as CodeDoc | undefined

  if (existing) {
    const sinceLastSend = secondsSince(existing.lastSentAt, now)
    if (sinceLastSend < RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        error: 'A code is already on its way.',
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - sinceLastSend),
      }
    }
    const windowAgeMinutes = secondsSince(existing.windowStartedAt, now) / 60
    if (windowAgeMinutes < SEND_WINDOW_MINUTES && existing.sendCount >= MAX_SENDS_PER_WINDOW) {
      return {
        ok: false,
        error: 'Too many codes requested for this address. Try again in an hour.',
        retryAfterSeconds: Math.ceil((SEND_WINDOW_MINUTES - windowAgeMinutes) * 60),
      }
    }
  }

  const windowExpired =
    !existing || secondsSince(existing.windowStartedAt, now) / 60 >= SEND_WINDOW_MINUTES
  const code = newCode()
  const nowStamp = Timestamp.fromDate(now)

  const record: CodeDoc = {
    codeHash: hashCode(email, code),
    expiresAt: Timestamp.fromDate(new Date(now.getTime() + CODE_TTL_MINUTES * 60_000)),
    // A resend restores the full attempt budget; the old code is already dead.
    attempts: 0,
    sendCount: windowExpired ? 1 : (existing?.sendCount ?? 0) + 1,
    windowStartedAt: windowExpired ? nowStamp : existing.windowStartedAt,
    lastSentAt: nowStamp,
  }
  await ref.set(record)

  return { ok: true, code, expiresInMinutes: CODE_TTL_MINUTES }
}

export type VerifyResult = { ok: true } | { ok: false; error: string }

export async function verifyCode(email: string, candidate: string): Promise<VerifyResult> {
  const ref = db.collection(COLLECTION).doc(docId(email))
  const doc = (await ref.get()).data() as CodeDoc | undefined

  // One message for every failure below, so a prober cannot tell "no code for
  // this address" from "wrong code" and use the difference to discover which
  // addresses have accounts.
  const rejected = { ok: false as const, error: 'That code is not right, or it has expired.' }

  if (!doc) return rejected
  if (doc.expiresAt.toDate() <= new Date()) {
    await ref.delete().catch(() => {})
    return rejected
  }
  if (doc.attempts >= MAX_ATTEMPTS) {
    await ref.delete().catch(() => {})
    return { ok: false, error: 'Too many wrong codes. Request a new one.' }
  }
  if (!safeEqual(doc.codeHash, hashCode(email, candidate))) {
    await ref.update({ attempts: doc.attempts + 1 })
    return rejected
  }

  // Single use: consumed the moment it works.
  await ref.delete().catch(() => {})
  return { ok: true }
}

/**
 * Per-network ceiling, counted in its own document so that spreading requests
 * across many addresses does not slip past the per-address limit.
 */
async function ipIsFlooding(ip: string, now: Date): Promise<boolean> {
  const ref = db
    .collection(COLLECTION)
    .doc(`ip_${createHash('sha256').update(`allparx-code-ip:${ip}`).digest('hex')}`)
  const doc = (await ref.get()).data() as
    | { sendCount: number; windowStartedAt: Timestamp }
    | undefined

  const expired = !doc || secondsSince(doc.windowStartedAt, now) / 60 >= SEND_WINDOW_MINUTES
  if (!expired && doc.sendCount >= MAX_SENDS_PER_IP) return true

  await ref.set({
    sendCount: expired ? 1 : doc.sendCount + 1,
    windowStartedAt: expired ? Timestamp.fromDate(now) : doc.windowStartedAt,
  })
  return false
}
