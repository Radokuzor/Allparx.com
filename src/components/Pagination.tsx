import Link from 'next/link'

/** `basePath` is the page-1 URL; page N lives at `${basePath}/page/${n}`. */
export default function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number
  totalPages: number
  basePath: string
}) {
  if (totalPages <= 1) return null

  const hrefFor = (page: number) => (page === 1 ? basePath : `${basePath}/page/${page}`)

  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {currentPage > 1 && (
        <Link
          href={hrefFor(currentPage - 1)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-green-200 hover:text-green-700"
        >
          ← Prev
        </Link>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Link
          key={page}
          href={hrefFor(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            page === currentPage
              ? 'bg-green-700 text-white'
              : 'border border-gray-200 text-gray-600 hover:border-green-200 hover:text-green-700'
          }`}
        >
          {page}
        </Link>
      ))}
      {currentPage < totalPages && (
        <Link
          href={hrefFor(currentPage + 1)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-green-200 hover:text-green-700"
        >
          Next →
        </Link>
      )}
    </nav>
  )
}
