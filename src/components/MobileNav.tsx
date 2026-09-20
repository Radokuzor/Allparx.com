'use client'

import Link from 'next/link'
import { Heart, LocateFixed, LogOut, Menu, Search, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { FEATURED_TYPES, typeLabelPlural } from '@/lib/place-types'

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const { status, user, openSignIn, signOut, available } = useAuth()

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-green-200 hover:text-green-700"
      >
        {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-gray-100 bg-white p-2 shadow-lg"
        >
          <div className="flex flex-col gap-0.5">
            {FEATURED_TYPES.map((type) => (
              <Link
                key={type}
                href={`/places/category/${type}`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
              >
                {typeLabelPlural(type)}
              </Link>
            ))}
            <Link
              href="/near-me"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
            >
              <LocateFixed className="h-4 w-4" />
              Near me
            </Link>
            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800"
            >
              <Search className="h-4 w-4" />
              Search
            </Link>

            {available && status !== 'loading' && (
              <div className="mt-1 border-t border-gray-100 pt-1">
                {status === 'signed-in' ? (
                  <>
                    <p className="truncate px-3 pb-1 pt-1.5 text-xs text-gray-400">{user?.email}</p>
                    <Link
                      href="/my/saved"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
                    >
                      <Heart className="h-4 w-4" />
                      Saved places
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        void signOut()
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      openSignIn()
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
                  >
                    Sign in
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
