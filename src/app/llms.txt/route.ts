import { citySlug, getAllCities } from '@/lib/firestore'
import { PLACE_TYPES, typeLabelPlural } from '@/lib/place-types'
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/site'

export const revalidate = 86400

/**
 * /llms.txt — the emerging convention for telling AI crawlers and assistants
 * what a site contains and where its structured entry points are, in markdown
 * they can read without executing JavaScript.
 *
 * https://llmstxt.org
 */
export async function GET() {
  const cities = await getAllCities()

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a directory of outdoor recreation locations across the United States.
Every listing carries a name, address, coordinates, Google rating and review count,
opening hours, and amenity flags (dogs allowed, family friendly, restrooms, parking).
Place data originates from the Google Places API and is refreshed periodically.

Each listing page is a static HTML document with schema.org JSON-LD describing the
place, so its facts can be read directly from the markup.

## URL structure

- \`/places/{place-slug}\` — one page per location, slug is \`{name}-{city}\` lowercased and hyphenated
- \`/places/category/{type}\` — all locations of one category
- \`/cities/{city-slug}\` — all locations in one city, grouped by category
- \`/sitemap.xml\` — every indexable URL

## Categories

${PLACE_TYPES.map((type) => `- [${typeLabelPlural(type)}](${absoluteUrl(`/places/category/${type}`)})`).join('\n')}

## Cities

${
  cities.length > 0
    ? cities.map((city) => `- [${city}](${absoluteUrl(`/cities/${citySlug(city)}`)})`).join('\n')
    : '- (no cities ingested yet)'
}

## Index pages

- [All categories](${absoluteUrl('/places')})
- [All cities](${absoluteUrl('/cities')})
- [Sitemap](${absoluteUrl('/sitemap.xml')})
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
