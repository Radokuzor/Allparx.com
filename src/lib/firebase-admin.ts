import * as admin from 'firebase-admin'

/**
 * Server-only Firebase Admin singleton.
 *
 * Next.js re-evaluates modules across hot reloads and route workers, so the
 * `apps.length` guard is what keeps us from re-initializing the default app.
 */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel stores the PEM with literal \n sequences; Firestore needs real newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const db = admin.firestore()
export default admin
