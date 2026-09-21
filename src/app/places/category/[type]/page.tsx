import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DEAD_URL_DESTINATION } from '@/lib/dead-url'
import { CategoryView, categoryMetadata } from './CategoryView'
import { PLACE_TYPES, isKnownType } from '@/lib/place-types'

type Props = { params: Promise<{ type: string }> }

export const dynamic = 'force-static'
export const dynamicParams = true

export async function generateStaticParams() {
  return PLACE_TYPES.map((type) => ({ type }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params
  if (!isKnownType(type)) return { title: 'Not Found', robots: { index: false, follow: false } }
  return categoryMetadata(type, 1)
}

export default async function CategoryPage({ params }: Props) {
  const { type } = await params
  if (!isKnownType(type)) redirect(DEAD_URL_DESTINATION)

  return <CategoryView type={type} page={1} />
}
