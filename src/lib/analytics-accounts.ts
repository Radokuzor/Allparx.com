import 'server-only'
import admin, { db } from './firebase-admin'
import { WISHLIST, VISITED } from './lists'
import type { Row } from './analytics-report'

/**
 * Sign-up and saved-place figures for the dashboard.
 *
 * Firebase Auth, not Firestore, is the source of truth for accounts and
 * sign-in method — `listUsers` is the only place that information lives — so
 * this reads the Auth API directly rather than a `users` collection query.
 * Firestore is read only for the saved-place counts, which live nowhere else.
 *
 * Auth has no "created between X and Y" query, so every account is paged in
 * and filtered here. That is fine at hundreds or a few thousand users; if the
 * count ever gets large enough to matter, mirror `createdAt` into the
 * Firestore profile at sign-up and query that instead.
 */

const MAX_USERS = 10_000

export type SignupRow = {
  uid: string
  /** First and last character only, so the dashboard can be shown without care. */
  email: string
  method: 'google.com' | 'email code'
  createdAt: Date
  lastSignedIn: Date | null
}

export interface AccountsReport {
  totals: {
    allTime: number
    inRange: number
    google: number
    emailCode: number
    /** Accounts with at least one saved place. */
    withSaves: number
  }
  series: { label: string; count: number }[]
  savedPlaces: {
    total: number
    wishlist: number
    visited: number
  }
  mostSaved: Row[]
  recent: SignupRow[]
}


async function listAllUsers(): Promise<admin.auth.UserRecord[]> {
  const users: admin.auth.UserRecord[] = []
  let pageToken: string | undefined
  do {
    const page = await admin.auth().listUsers(1000, pageToken)
    users.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken && users.length < MAX_USERS)
  return users
}

function dayLabel(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function loadAccountsReport(since: Date, days: number): Promise<AccountsReport> {
  const users = await listAllUsers()

  const inRange = users.filter((u) => new Date(u.metadata.creationTime) >= since)
  const method = (u: admin.auth.UserRecord): SignupRow['method'] =>
    u.providerData.some((p) => p.providerId === 'google.com') ? 'google.com' : 'email code'

  const labels = Array.from({ length: days }, (_, i) =>
    dayLabel(new Date(since.getTime() + i * 86_400_000)),
  )
  const byDay = new Map(labels.map((label) => [label, 0]))
  for (const user of inRange) {
    const label = dayLabel(new Date(user.metadata.creationTime))
    if (byDay.has(label)) byDay.set(label, (byDay.get(label) ?? 0) + 1)
  }

  // Every save lives in a per-user subcollection, so the count is a
  // collectionGroup query rather than one read per account.
  const savesSnapshot = await db.collectionGroup('saves').get()
  const withSaves = new Set(savesSnapshot.docs.map((doc) => doc.ref.parent.parent!.id))

  let wishlist = 0
  let visited = 0
  const placeCounts = new Map<string, { name: string; count: number }>()
  for (const doc of savesSnapshot.docs) {
    const data = doc.data() as { lists?: string[]; slug?: string; name?: string }
    const lists = Array.isArray(data.lists) ? data.lists : []
    if (lists.includes(WISHLIST)) wishlist += 1
    if (lists.includes(VISITED)) visited += 1
    const slug = data.slug ?? doc.id
    const entry = placeCounts.get(slug)
    if (entry) entry.count += 1
    else placeCounts.set(slug, { name: data.name ?? slug, count: 1 })
  }

  const mostSaved: Row[] = [...placeCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map((p) => ({ label: p.name, count: p.count, share: users.length ? p.count / users.length : 0 }))

  return {
    totals: {
      allTime: users.length,
      inRange: inRange.length,
      google: inRange.filter((u) => method(u) === 'google.com').length,
      emailCode: inRange.filter((u) => method(u) === 'email code').length,
      withSaves: withSaves.size,
    },
    series: labels.map((label) => ({ label, count: byDay.get(label) ?? 0 })),
    savedPlaces: { total: savesSnapshot.size, wishlist, visited },
    mostSaved,
    recent: inRange
      .sort((a, b) => new Date(b.metadata.creationTime).getTime() - new Date(a.metadata.creationTime).getTime())
      .slice(0, 50)
      .map((u) => ({
        uid: u.uid,
        email: u.email ?? '(no email)',
        method: method(u),
        createdAt: new Date(u.metadata.creationTime),
        lastSignedIn: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime) : null,
      })),
  }
}
