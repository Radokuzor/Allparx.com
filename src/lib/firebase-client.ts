'use client'

import type { Auth } from 'firebase/auth'

/**
 * Browser-side Firebase, loaded on demand.
 *
 * Every place page is prerendered and served from the CDN, so the auth SDK
 * must not sit in the bundle those pages ship. Nothing here is imported at the
 * top level: the first caller pulls it in, and a visitor who never signs in
 * never downloads it.
 *
 * The API key is public by design — it identifies the project, it does not
 * authorise anything. What protects the data is that Firestore refuses every
 * browser (see firestore.rules) and user data only moves through API routes
 * that verify an ID token.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function firebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

let pending: Promise<Auth> | null = null

export function firebaseAuth(): Promise<Auth> {
  pending ??= load()
  return pending
}

async function load(): Promise<Auth> {
  if (!firebaseConfigured()) {
    throw new Error(
      'Firebase web config is missing. Set NEXT_PUBLIC_FIREBASE_API_KEY, ' +
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN and NEXT_PUBLIC_FIREBASE_APP_ID.',
    )
  }

  const { getApp, getApps, initializeApp } = await import('firebase/app')
  const { browserLocalPersistence, indexedDBLocalPersistence, initializeAuth, getAuth } =
    await import('firebase/auth')

  const app = getApps().length ? getApp() : initializeApp(config)

  try {
    // IndexedDB first so the session survives a browser restart — that is what
    // "stay signed in on this device" means here. localStorage is the fallback
    // for private windows, where IndexedDB can be unavailable.
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    })
  } catch {
    // initializeAuth throws if auth was already set up on this app instance.
    return getAuth(app)
  }
}
