'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Compass, Loader2, Check } from 'lucide-react'

/**
 * "Send me a local guide for <place>", dropped into the middle of an article
 * rather than at the end, where the reader is still deciding whether the place
 * is worth the drive and has not yet scrolled away.
 *
 * One field. Asking for a name or a zip here costs more sign-ups than it is
 * worth, and the place is already known from the page, so there is nothing else
 * to ask for. The hidden `company` input and `elapsedMs` are the bot gate: a
 * script that fills every field still has to look like it waited.
 */
export default function GuideCta({
  placeSlug,
  placeName,
}: {
  placeSlug: string
  placeName: string
}) {
  const id = useId()
  // Stamped after mount, so the elapsed check measures reading time rather
  // than however long the HTML sat in a cache before it was painted.
  const startedAt = useRef<number | null>(null)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setError(null)

    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/guide-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          placeSlug,
          path: window.location.pathname,
          elapsedMs: startedAt.current ? Date.now() - startedAt.current : 0,
          company: data.get('company'),
        }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        setError(payload?.error ?? 'Something went wrong. Please try again.')
        setState('idle')
        return
      }
      setState('sent')
    } catch {
      setError('That did not go through. Check your connection and try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <aside className="my-10 rounded-2xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden />
          <div>
            <p className="font-semibold text-green-900">Your guide is on its way</p>
            <p className="mt-1 text-sm leading-relaxed text-green-800">
              Check your inbox for a welcome email. The local guide for {placeName} follows once it
              is written.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="my-10 rounded-2xl border border-gray-200 bg-gradient-to-br from-green-50 to-white p-6 sm:p-7">
      <div className="flex items-center gap-2 text-green-800">
        <Compass className="h-5 w-5" aria-hidden />
        <p className="text-xs font-semibold tracking-wider uppercase">AllParx explorer</p>
      </div>

      <h2 className="mt-3 text-xl font-semibold text-gray-900">
        Send me a local guide for {placeName}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        We will write one for this place: the best time to go, what to bring, where to park and what
        catches people out. Enter your email and it comes to you when it is ready.
      </p>

      <form onSubmit={onSubmit} className="mt-5">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full flex-1 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600/20 focus:outline-none"
          />
          <button
            type="submit"
            disabled={state === 'sending'}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-green-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-900 disabled:opacity-70"
          >
            {state === 'sending' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Sending
              </>
            ) : (
              'Send my guide'
            )}
          </button>
        </div>

        {/* Bots fill this in, people never see it. */}
        <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor={`${id}-company`}>Company</label>
          <input id={`${id}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-700">{error}</p>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            One welcome email now, then your guide. No spam, unsubscribe in one click.
          </p>
        )}
      </form>
    </aside>
  )
}
