'use client'

import Link from 'next/link'
import { Heart, LogOut, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'

/**
 * Header account control: a sign-in button, or the avatar and its menu.
 *
 * Renders nothing at all until the session is known. The header is the first
 * thing on the page, and flashing "Sign in" at someone who is already signed
 * in reads as having been logged out.
 */
export default function UserMenu({ className }: { className?: string }) {
  const { user, status, openSignIn, signOut, available } = useAuth()
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  if (!available) return null

  if (status === 'loading') {
    return <div className={className} aria-hidden="true" style={{ width: 76, height: 36 }} />
  }

  if (status === 'signed-out') {
    return (
      <button
        type="button"
        data-track="Sign in (header)"
        onClick={() => openSignIn()}
        className={`text-sm font-medium text-gray-600 transition-colors hover:text-green-700 ${className ?? ''}`}
      >
        Sign in
      </button>
    )
  }

  const initial = (user?.displayName || user?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div ref={wrapper} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Your account"
        data-track="Account menu"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-green-700 text-sm font-semibold text-white transition-transform hover:scale-105"
      >
        {user?.photoURL ? (
          // Avatars come from Google at an arbitrary host, so this stays a
          // plain img rather than adding a remote pattern for every provider.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-xs text-gray-400">{user?.email}</p>
          <Link
            href="/my/saved"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
          >
            <Heart className="h-4 w-4" />
            Saved places
          </Link>
          <Link
            href="/my/parks"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
          >
            <User className="h-4 w-4" />
            My parks
          </Link>
          <button
            type="button"
            role="menuitem"
            data-track="Sign out"
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
            className="flex w-full items-center gap-2.5 border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
