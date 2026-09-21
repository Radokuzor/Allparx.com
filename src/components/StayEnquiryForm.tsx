'use client'

import { useId, useState } from 'react'
import { CalendarDays, Check, Loader2, Send } from 'lucide-react'

/**
 * The stay enquiry form on a hotel page.
 *
 * Wording is deliberate: "Request availability", not "Book now". This sends a
 * message to AllParx, who reply by email — no room is held and no payment is
 * taken, and the notice under the button says so rather than burying it. The
 * hotel's own site is linked beside it so booking direct is never harder than
 * using this.
 */
export default function StayEnquiryForm({
  hotelSlug,
  hotelName,
  website,
  notice,
}: {
  hotelSlug: string
  hotelName: string
  website: string
  notice: string
}) {
  const id = useId()
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setError(null)

    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/stay-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelSlug,
          name: data.get('name'),
          email: data.get('email'),
          checkIn: data.get('checkIn'),
          checkOut: data.get('checkOut'),
          adults: Number(data.get('adults')),
          children: Number(data.get('children')),
          notes: data.get('notes'),
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
      setError('Could not reach the server. Please check your connection and try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50/60 p-6">
        <div className="flex items-center gap-2 text-green-800">
          <Check className="h-5 w-5" />
          <h3 className="font-semibold">Enquiry sent</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Thanks — we have your request for {hotelName} and will reply by email. Nothing is
          reserved yet. If you would rather not wait, you can book directly with the hotel:
        </p>
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-green-700 underline underline-offset-2"
        >
          {hotelName} official site
        </a>
      </div>
    )
  }

  const field =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 ' +
    'outline-none transition-colors placeholder:text-gray-400 focus:border-green-500'
  const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="flex items-center gap-2 font-semibold text-gray-900">
        <CalendarDays className="h-5 w-5 text-green-700" />
        Request availability
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Tell us your dates and we&apos;ll come back with options for {hotelName}.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className={label} htmlFor={`${id}-name`}>
            Name
          </label>
          <input id={`${id}-name`} name="name" required maxLength={120} className={field} />
        </div>
        <div>
          <label className={label} htmlFor={`${id}-email`}>
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            maxLength={200}
            className={field}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor={`${id}-in`}>
              Check-in
            </label>
            <input id={`${id}-in`} name="checkIn" type="date" className={field} />
          </div>
          <div>
            <label className={label} htmlFor={`${id}-out`}>
              Check-out
            </label>
            <input id={`${id}-out`} name="checkOut" type="date" className={field} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor={`${id}-adults`}>
              Adults
            </label>
            <input
              id={`${id}-adults`}
              name="adults"
              type="number"
              min={1}
              max={20}
              defaultValue={2}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor={`${id}-children`}>
              Children
            </label>
            <input
              id={`${id}-children`}
              name="children"
              type="number"
              min={0}
              max={20}
              defaultValue={0}
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={label} htmlFor={`${id}-notes`}>
            Anything else
          </label>
          <textarea
            id={`${id}-notes`}
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Room type, occasion, flexibility on dates…"
            className={field}
          />
        </div>

        {/* Honeypot: off-screen and hidden from assistive tech, so only a bot fills it. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${id}-company`}>Company</label>
          <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        data-track="Stay enquiry: send"
        disabled={state === 'sending'}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60"
      >
        {state === 'sending' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Send enquiry
          </>
        )}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-gray-400">{notice}</p>
      <a
        href={website}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-semibold text-green-700 underline underline-offset-2"
      >
        Book direct with {hotelName}
      </a>
    </form>
  )
}
