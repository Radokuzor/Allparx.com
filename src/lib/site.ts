export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://allparx.com').replace(/\/$/, '')
export const SITE_NAME = 'AllParx'
export const SITE_TAGLINE = 'Discover Parks & Outdoor Recreation Near You'
export const SITE_DESCRIPTION =
  'Find parks, trails, dog parks, beaches, campgrounds and outdoor recreation spots across America. Hours, ratings, amenities and directions for every listing.'

export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
