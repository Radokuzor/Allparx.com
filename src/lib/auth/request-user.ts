import 'server-only'
import admin from '../firebase-admin'

/**
 * Identifies the caller of an API route from its `Authorization: Bearer`
 * header.
 *
 * A bearer token rather than a session cookie, for two reasons: a request that
 * carries no cookie cannot be forged from another origin, so there is no CSRF
 * token to get wrong; and the same header works unchanged from a native app
 * later, where cookies are the awkward path.
 *
 * Every signed-in route starts here. There is no other way into user data.
 */

export type RequestUser = { uid: string; email: string | null }

export async function requestUser(request: Request): Promise<RequestUser | null> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice(7).trim()
  if (!token) return null

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    // Everything behind sign-in is gated on a proven address: the code flow
    // sets this, and Google sets it for us. An unverified token means someone
    // reached Firebase Auth by a path we did not build.
    if (!decoded.email_verified) return null
    return { uid: decoded.uid, email: decoded.email ?? null }
  } catch {
    // Expired or tampered-with. The client refreshes and retries.
    return null
  }
}
