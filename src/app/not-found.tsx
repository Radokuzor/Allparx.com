import Link from 'next/link'
import { Suspense } from 'react'
import NotFoundSuggestions from '@/components/NotFoundSuggestions'

/**
 * Still a real 404 — the status code is what tells Google a URL is gone, and
 * returning 200 here would make every dead link a soft 404. Only the content
 * changes: most of these URLs come from the previous allparx.com and still
 * name the place the visitor wanted, so the page tries to find it.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-green-700">404</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">We couldn&apos;t find that place</h1>
      <p className="mt-3 text-gray-500">
        This page may have moved since the site was rebuilt. Try one of these instead.
      </p>

      <Suspense fallback={null}>
        <NotFoundSuggestions />
      </Suspense>

      <div className="mt-10 flex flex-wrap justify-center gap-3 border-t border-gray-100 pt-8">
        <Link
          href="/places"
          className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          All categories
        </Link>
        <Link
          href="/cities"
          className="rounded-lg border border-green-200 px-5 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          All cities
        </Link>
      </div>
    </div>
  )
}
