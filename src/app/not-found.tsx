import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-green-700">404</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">We couldn&apos;t find that place</h1>
      <p className="mt-3 text-gray-500">
        It may have been removed, or the link may be wrong. Try browsing by category or city.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
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
