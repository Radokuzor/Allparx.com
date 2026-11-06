'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, Compass } from 'lucide-react'

/**
 * "Send me a local guide for <place>", dropped into the middle of an article so
 * the ask arrives while the reader is still deciding whether the place is worth
 * the drive rather than after they have scrolled away.
 *
 * Heading, one field, one button. No pitch, no fine print: the ask explains
 * itself. The hidden `company` input and `elapsedMs` are the bot gate, since a
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
      setError('That did not go through. Try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <aside className="my-10 rounded-2xl border border-green-200 bg-green-50 p-6">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 shrink-0 text-green-700" aria-hidden />
          <p className="font-semibold text-green-900">Your guide is on its way</p>
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
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-green-800 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-900 disabled:opacity-70"
          >
            {state === 'sending' ? 'Sending' : 'Send'}
          </button>
        </div>

        {/* Bots fill this in, people never see it. */}
        <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
          <label htmlFor={`${id}-company`}>Company</label>
          <input id={`${id}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </form>
    </aside>
  )
}
