import Link from 'next/link'
import { Suspense } from 'react'
import NotFoundSuggestions from '@/components/NotFoundSuggestions'

/**
 * A last-resort fallback only. Dead URLs no longer reach it: unmatched paths
 * are caught by app/[...slug]/page.tsx and the dynamic routes redirect to the
 * home page instead of calling notFound(). It would show if something threw
 * notFound() again, so it stays rather than falling back to Next's bare 404.
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
