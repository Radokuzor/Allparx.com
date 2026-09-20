'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { firebaseAuth, firebaseConfigured } from '@/lib/firebase-client'
import { WISHLIST, type SavedMap } from '@/lib/lists'
import AuthDialog from './AuthDialog'

/**
 * Holds the signed-in session for the whole site.
 *
 * Two things live here rather than in each component:
 *
 *  - The saved-places map, fetched once per page load. A grid of 48 cards each
 *    asking "is this one saved?" would be 48 requests; this is one.
 *  - The intent that opened the sign-in popup. Someone who clicks the heart on
 *    a park while signed out means "save this park" — so once they are in, the
 *    save happens by itself instead of making them find the button again.
 */

export type AccountUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

type AuthState = {
  user: AccountUser | null
  /** 'loading' until Firebase has restored (or ruled out) a stored session. */
  status: 'loading' | 'signed-out' | 'signed-in'
  saved: SavedMap
  /** False when the Firebase web config is absent, so the UI can stay hidden. */
  available: boolean
  openSignIn: (prompt?: string) => void
  signOut: () => Promise<void>
  toggleSave: (slug: string, list?: string) => Promise<void>
  /** fetch() with the current ID token attached; null when nobody is signed in. */
  authedFetch: (url: string, init?: RequestInit) => Promise<Response | null>
  isSaved: (slug: string, list?: string) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // Fixed at build time from the environment, so the starting status can
  // account for it rather than an effect correcting it on the first render.
  const available = firebaseConfigured()

  const [user, setUser] = useState<AccountUser | null>(null)
  const [status, setStatus] = useState<AuthState['status']>(available ? 'loading' : 'signed-out')
  const [saved, setSaved] = useState<SavedMap>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [prompt, setPrompt] = useState<string | undefined>()

  const pendingSave = useRef<{ slug: string; list: string } | null>(null)
  /**
   * Mirrors `saved` for the callbacks below. Reading state through a ref keeps
   * `commitToggle` from being rebuilt on every save, which would otherwise
   * re-run the effects that depend on it.
   */
  const savedRef = useRef<SavedMap>({})

  const applySaved = useCallback((next: SavedMap) => {
    savedRef.current = next
    setSaved(next)
  }, [])

  const authedFetch = useCallback(
    async (url: string, init: RequestInit = {}): Promise<Response | null> => {
      if (!available) return null
      const auth = await firebaseAuth()
      // The SDK refreshes this for us when it is close to expiring.
      const bearer = await auth.currentUser?.getIdToken()
      if (!bearer) return null
      return fetch(url, {
        ...init,
        headers: {
          ...init.headers,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer}`,
        },
      })
    },
    [available],
  )

  const commitToggle = useCallback(
    async (slug: string, list: string) => {
      const before = savedRef.current[slug] ?? []
      const after = before.includes(list)
        ? before.filter((entry) => entry !== list)
        : [...before, list]

      // Optimistic: the heart fills on the click, not on the round trip.
      const next = { ...savedRef.current }
      if (after.length === 0) delete next[slug]
      else next[slug] = after
      applySaved(next)

      const response = await authedFetch('/api/me/saves', {
        method: 'POST',
        body: JSON.stringify({ slug, list }),
      }).catch(() => null)

      if (!response?.ok) {
        // Put it back the way it was; the click did not take.
        const reverted = { ...savedRef.current }
        if (before.length === 0) delete reverted[slug]
        else reverted[slug] = before
        applySaved(reverted)
      }
    },
    [authedFetch, applySaved],
  )

  // Restore the session, then keep it in step with sign-in and sign-out.
  useEffect(() => {
    if (!available) return
    let active = true
    let unsubscribe: (() => void) | undefined

    firebaseAuth()
      .then(async (auth) => {
        const { onAuthStateChanged } = await import('firebase/auth')
        if (!active) return
        unsubscribe = onAuthStateChanged(auth, (next: User | null) => {
          if (!active) return
          setUser(
            next
              ? {
                  uid: next.uid,
                  email: next.email,
                  displayName: next.displayName,
                  photoURL: next.photoURL,
                }
              : null,
          )
          setStatus(next ? 'signed-in' : 'signed-out')
          if (!next) applySaved({})
        })
      })
      .catch((error) => {
        console.warn('[auth] could not start Firebase', error)
        if (active) setStatus('signed-out')
      })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [available, applySaved])

  // Once signed in, pull the saved list, then finish whatever the person was
  // doing when the popup interrupted them.
  useEffect(() => {
    if (status !== 'signed-in') return
    let active = true

    void (async () => {
      const response = await authedFetch('/api/me').catch(() => null)
      if (!active) return

      let map: SavedMap = {}
      if (response?.ok) {
        const data = (await response.json()) as { saved?: SavedMap }
        map = data.saved ?? {}
        if (!active) return
        applySaved(map)
      }

      const intent = pendingSave.current
      pendingSave.current = null
      // Only act if it is not already there: on a second device the place may
      // have been saved long ago, and a blind toggle would remove it.
      if (intent && !(map[intent.slug] ?? []).includes(intent.list)) {
        await commitToggle(intent.slug, intent.list)
      }
    })()

    return () => {
      active = false
    }
  }, [status, authedFetch, applySaved, commitToggle])

  const openSignIn = useCallback((message?: string) => {
    setPrompt(message)
    setDialogOpen(true)
  }, [])

  const toggleSave = useCallback(
    async (slug: string, list = WISHLIST) => {
      if (status !== 'signed-in') {
        pendingSave.current = { slug, list }
        openSignIn(
          list === WISHLIST
            ? 'Sign in to save this place to your list.'
            : 'Sign in to keep track of the places you have been.',
        )
        return
      }
      await commitToggle(slug, list)
    },
    [status, openSignIn, commitToggle],
  )

  const signOut = useCallback(async () => {
    const auth = await firebaseAuth()
    const { signOut: endSession } = await import('firebase/auth')
    await endSession(auth)
    applySaved({})
  }, [applySaved])

  const isSaved = useCallback(
    (slug: string, list = WISHLIST) => (saved[slug] ?? []).includes(list),
    [saved],
  )

  const value = useMemo<AuthState>(
    () => ({ user, status, saved, available, openSignIn, signOut, toggleSave, isSaved, authedFetch }),
    [user, status, saved, available, openSignIn, signOut, toggleSave, isSaved, authedFetch],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialogOpen && (
        <AuthDialog
          prompt={prompt}
          onClose={() => {
            setDialogOpen(false)
            // Abandoning the popup abandons the save that opened it.
            pendingSave.current = null
          }}
          onSignedIn={() => setDialogOpen(false)}
        />
      )}
    </AuthContext.Provider>
  )
}
