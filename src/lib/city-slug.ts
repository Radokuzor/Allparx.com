/**
 * URL-safe form of a city name, e.g. "Salt Lake City" -> "salt-lake-city".
 *
 * Lives in its own module because `firestore.ts` is `server-only` and the
 * search suggestions run in the browser, where they need to build /cities
 * links with exactly the same slugs the static pages were generated under.
 * `firestore.ts` re-exports this so there is only ever one implementation.
 */
export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
