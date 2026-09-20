'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Loader2, Mail, TreePine, X } from 'lucide-react'
import { firebaseAuth } from '@/lib/firebase-client'
import { SITE_NAME } from '@/lib/site'
import OtpInput from './OtpInput'

/**
 * The whole sign-up and sign-in flow, in one popup.
 *
 * There is no separate "create an account" path on purpose: an address either
 * has an account or gets one the first time a code checks out, so the person
 * is never asked which of the two they are doing. No password, so nothing to
 * forget and nothing for us to store.
 */

const RESEND_SECONDS = 45

type Props = {
  prompt?: string
  onClose: () => void
  onSignedIn: () => void
}

export default function AuthDialog({ prompt, onClose, onSignedIn }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const panel = useRef<HTMLDivElement>(null)

  // Escape closes, and the page behind must not scroll while this is up.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const requestCode = useCallback(
    async (address: string) => {
      setBusy(true)
      setError(null)
      try {
        const response = await fetch('/api/auth/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: address }),
        })
        const data = (await response.json().catch(() => ({}))) as {
          error?: string
          retryAfterSeconds?: number | null
        }
        if (!response.ok) {
          setError(data.error ?? 'Something went wrong. Please try again.')
          // A 429 means a code is already in flight, so the code step is still
          // the right place to be — they just cannot ask for another one yet.
          if (response.status === 429) {
            setStep('code')
            setCooldown(data.retryAfterSeconds ?? RESEND_SECONDS)
          }
          return
        }
        setStep('code')
        setCode('')
        setCooldown(RESEND_SECONDS)
      } catch {
        setError('We could not reach the server. Check your connection and try again.')
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const submitCode = useCallback(
    async (candidate: string) => {
      setBusy(true)
      setError(null)
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: candidate }),
        })
        const data = (await response.json().catch(() => ({}))) as { error?: string; token?: string }
        if (!response.ok || !data.token) {
          setError(data.error ?? 'That code is not right.')
          setCode('')
          return
        }
        const auth = await firebaseAuth()
        const { signInWithCustomToken } = await import('firebase/auth')
        await signInWithCustomToken(auth, data.token)
        onSignedIn()
      } catch {
        setError('We could not sign you in just now. Please try again.')
        setCode('')
      } finally {
        setBusy(false)
      }
    },
    [email, onSignedIn],
  )

  const continueWithGoogle = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const auth = await firebaseAuth()
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = await import(
        'firebase/auth'
      )
      const provider = new GoogleAuthProvider()
      try {
        await signInWithPopup(auth, provider)
      } catch (popupError) {
        // In-app browsers (Instagram, Facebook, some mail apps) block popups.
        // A redirect is the only thing that works there.
        const code = (popupError as { code?: string }).code ?? ''
        if (code.includes('popup') || code.includes('not-supported')) {
          await signInWithRedirect(auth, provider)
          return
        }
        throw popupError
      }
      onSignedIn()
    } catch (googleError) {
      const code = (googleError as { code?: string }).code ?? ''
      // Closing the Google window is a decision, not a failure.
      if (!code.includes('cancelled') && !code.includes('closed-by-user')) {
        setError('Google sign-in did not complete. Try your email instead.')
      }
    } finally {
      setBusy(false)
    }
  }, [onSignedIn])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-gray-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (!panel.current?.contains(event.target as Node)) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <TreePine className="h-6 w-6 text-green-700" strokeWidth={2.25} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {step === 'email' ? (
          <>
            <h2 id="auth-dialog-title" className="mt-4 text-xl font-bold text-gray-900">
              {prompt ? 'Save it to your list' : `Welcome to ${SITE_NAME}`}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              {prompt ?? 'Sign in to save places, track the parks you have visited, and plan trips.'}
            </p>

            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault()
                if (!busy) void requestCode(email.trim())
              }}
            >
              <label htmlFor="auth-email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy}
                  className="h-12 w-full rounded-xl border border-gray-200 pl-11 pr-4 text-[15px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600/20 disabled:opacity-60"
                />
              </div>

              {error && <p className="mt-2.5 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={busy || email.trim().length < 6}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 text-[15px] font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-medium text-gray-400">or</span>
              <span className="h-px flex-1 bg-gray-100" />
            </div>

            <button
              type="button"
              onClick={() => void continueWithGoogle()}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 text-[15px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <GoogleMark />
              Continue with Google
            </button>

            <p className="mt-5 text-center text-xs leading-relaxed text-gray-400">
              We send a one-time code — there is no password to remember.
            </p>
          </>
        ) : (
          <>
            <h2 id="auth-dialog-title" className="mt-4 text-xl font-bold text-gray-900">
              Check your email
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>.
            </p>

            <div className="mt-6">
              <OtpInput
                value={code}
                onChange={(next) => {
                  setCode(next)
                  if (error) setError(null)
                }}
                onComplete={(next) => {
                  if (!busy) void submitCode(next)
                }}
                disabled={busy}
                invalid={!!error}
              />
            </div>

            {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

            {busy && (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking
              </p>
            )}

            <div className="mt-6 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError(null)
                }}
                className="font-medium text-gray-500 transition-colors hover:text-gray-800"
              >
                Use another email
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={() => void requestCode(email)}
                className="font-semibold text-green-700 transition-colors hover:text-green-800 disabled:text-gray-300"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Inline so the button does not depend on an outside asset to render. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5a11 11 0 0 0-9.82 6.55l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z"
      />
    </svg>
  )
}
