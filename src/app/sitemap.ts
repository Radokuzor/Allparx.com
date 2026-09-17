import type { MetadataRoute } from 'next'
import { CATEGORY_PAGE_SIZE, citySlug, getAllCities, getAllPlaceRefs } from '@/lib/firestore'
import { PLACE_TYPES } from '@/lib/place-types'
import { absoluteUrl } from '@/lib/site'

export const revalidate = 86400

/**
 * Single sitemap covering every route. Google's per-file ceiling is 50,000
 * URLs — if the place count ever approaches that, split this into
 * `generateSitemaps()` chunks plus a sitemap index.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [places, cities] = await Promise.all([getAllPlaceRefs(), getAllCities()])
  const now = new Date()

  const countsByType = new Map<string, number>()
  const cityTypeCombos = new Set<string>()
  for (const place of places) {
    countsByType.set(place.placeType, (countsByType.get(place.placeType) ?? 0) + 1)
    cityTypeCombos.add(`${citySlug(place.city)}::${place.placeType}`)
  }

  return [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/places'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/cities'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ...PLACE_TYPES.map((type) => ({
      url: absoluteUrl(`/places/category/${type}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    // Pages 2+ of categories with more than one page of places.
    ...PLACE_TYPES.flatMap((type) => {
      const totalPages = Math.ceil((countsByType.get(type) ?? 0) / CATEGORY_PAGE_SIZE)
      return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
        url: absoluteUrl(`/places/category/${type}/page/${i + 2}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    }),
    ...cities.map((city) => ({
      url: absoluteUrl(`/cities/${citySlug(city)}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    // City x category long-tail pages, one per combo that actually has places.
    ...[...cityTypeCombos].map((combo) => {
      const [citySlugPart, type] = combo.split('::')
      return {
        url: absoluteUrl(`/cities/${citySlugPart}/${type}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }
    }),
    ...places.map((place) => ({
      url: absoluteUrl(`/places/${place.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
