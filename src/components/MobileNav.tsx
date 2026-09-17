'use client'

import Link from 'next/link'
import { Menu, Search, X } from 'lucide-react'
import { useState } from 'react'
import { FEATURED_TYPES, typeLabelPlural } from '@/lib/place-types'

export default function MobileNav() {
  const [open, setOpen] = useState(false)

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
              href="/search"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800"
            >
              <Search className="h-4 w-4" />
              Search
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
