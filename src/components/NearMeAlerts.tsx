'use client'

import { useEffect, useState } from 'react'

/**
 * "Tell me when new places appear near me" — the only contact this site asks
 * for. No email, no account: a browser push subscription plus the town the
 * visitor is standing in, coarsened to one decimal (~7 miles).
 *
 * The prompt is a plain button rather than an automatic permission request,
 * because a permission dialog nobody asked for gets denied and cannot be asked
 * again. Nothing is requested until the person presses it.
 */

type Status = 'idle' | 'working' | 'on' | 'denied' | 'unsupported' | 'error' | 'no-location'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalised)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function currentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  })
}

export default function NearMeAlerts() {
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    let cancelled = false
    const apply = (next: Status) => {
      // Deferred so the first paint is identical on the server and the client:
      // support is a browser fact, discovered after hydration, not during it.
      Promise.resolve().then(() => {
        if (!cancelled) setStatus(next)
      })
    }

    if (!PUBLIC_KEY) return apply('unsupported')
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return apply('unsupported')
    }
    if (Notification.permission === 'denied') return apply('denied')

    navigator.serviceWorker
      .getRegistration('/sw.js')
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled && subscription) setStatus('on')
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    if (!PUBLIC_KEY) return
    setStatus('working')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return setStatus(permission === 'denied' ? 'denied' : 'idle')

      const position = await currentPosition()
      if (!position) return setStatus('no-location')

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const existing = await registration.pushManager.getSubscription()
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
        }))

      const lat = Math.round(position.coords.latitude * 10) / 10
      const lng = Math.round(position.coords.longitude * 10) / 10

      const result = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          lat,
          lng,
        }),
      })
      if (!result.ok) return setStatus('error')

      setStatus('on')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'unsupported') return null

  return (
    <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
      <p className="text-sm font-semibold text-gray-900">New places near you</p>
      {status === 'on' ? (
        <p className="mt-1 text-sm text-gray-600">
          Alerts are on for this area. We only message when places are actually added near you, at most once a week.
        </p>
      ) : status === 'denied' ? (
        <p className="mt-1 text-sm text-gray-600">
          Notifications are blocked for this site. Your browser settings can re-enable them.
        </p>
      ) : status === 'no-location' ? (
        <p className="mt-1 text-sm text-gray-600">
          Alerts need your location, so we know what counts as near. Nothing is stored except a point rounded to
          about seven miles.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">
            Get one notification when new parks, trails or dog parks are added near you. No email, no account, and
            nothing stored except a rounded location.
          </p>
          <button
            type="button"
            onClick={enable}
            disabled={status === 'working'}
            className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {status === 'working' ? 'Turning on…' : status === 'error' ? 'Try again' : 'Notify me'}
          </button>
        </>
      )}
    </div>
  )
}
