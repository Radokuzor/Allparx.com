import 'server-only'
import { getAllPlaces } from './firestore'
import { buildGuides, type Guide } from './guides'

/**
 * Guides are derived from the whole place list; building them once per
 * process keeps the index, every guide page, the place pages' "featured in"
 * links and the sitemap from each re-ranking every state.
 */
let guidesPromise: Promise<Guide[]> | null = null

export function getGuides(): Promise<Guide[]> {
  guidesPromise ??= getAllPlaces()
    .then(buildGuides)
    .catch((error) => {
      guidesPromise = null
      throw error
    })
  return guidesPromise
}

export async function getGuide(slug: string): Promise<Guide | null> {
  return (await getGuides()).find((guide) => guide.slug === slug) ?? null
}
