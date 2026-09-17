import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryView, categoryMetadata } from '../../CategoryView'
import { CATEGORY_PAGE_SIZE, getAllPlaceRefs } from '@/lib/firestore'
import { PLACE_TYPES, isKnownType } from '@/lib/place-types'

type Props = { params: Promise<{ type: string; page: string }> }

export const dynamic = 'force-static'
export const dynamicParams = false

// Page 1 lives at the parent route, so this only ever generates page >= 2 —
// and only as many pages as a category actually has, so `/page/99` 404s.
export async function generateStaticParams() {
  const refs = await getAllPlaceRefs()
  const counts = new Map<string, number>()
  for (const ref of refs) counts.set(ref.placeType, (counts.get(ref.placeType) ?? 0) + 1)

  return PLACE_TYPES.flatMap((type) => {
    const totalPages = Math.max(1, Math.ceil((counts.get(type) ?? 0) / CATEGORY_PAGE_SIZE))
    return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
      type,
      page: String(i + 2),
    }))
  })
}

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const page = Number(raw)
  return page >= 2 ? page : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, page } = await params
  const pageNumber = parsePage(page)
  if (!isKnownType(type) || pageNumber === null) {
    return { title: 'Not Found', robots: { index: false, follow: false } }
  }
  return categoryMetadata(type, pageNumber)
}

export default async function CategoryPagedPage({ params }: Props) {
  const { type, page } = await params
  const pageNumber = parsePage(page)
  if (!isKnownType(type) || pageNumber === null) notFound()

  return <CategoryView type={type} page={pageNumber} />
}
