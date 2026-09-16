/**
 * Decorative per-category artwork.
 *
 * Google Places photos cannot be stored under the Maps Platform terms, so
 * listings show licensed stock imagery chosen by category instead. These are
 * illustrative of the category, not photographs of the specific place, which is
 * why callers label them as such rather than presenting them as the venue.
 *
 * Each entry is the number of files in `public/img/categories/<type>/`, named
 * `1.jpg` through `n.jpg`. A category not listed here (or set to 0) renders the
 * gradient fallback, so this degrades cleanly before any images are added.
 */
export const CATEGORY_IMAGE_COUNT: Record<string, number> = {}

/** Stable string hash, so a given place keeps the same image across rebuilds. */
function hash(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function categoryImage(type: string, seed: string): string | null {
  const count = CATEGORY_IMAGE_COUNT[type] ?? 0
  if (count < 1) return null
  return `/img/categories/${type}/${(hash(seed) % count) + 1}.jpg`
}
