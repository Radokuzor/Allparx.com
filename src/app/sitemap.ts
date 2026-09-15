import type { MetadataRoute } from 'next'
import { citySlug, getAllCities, getAllPlaceRefs } from '@/lib/firestore'
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
    ...cities.map((city) => ({
      url: absoluteUrl(`/cities/${citySlug(city)}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...places.map((place) => ({
      url: absoluteUrl(`/places/${place.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
