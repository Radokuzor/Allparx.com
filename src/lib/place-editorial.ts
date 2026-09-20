import type { Faq } from './place-content'
import type { Photo } from './photos'
import banyanTree from '@/content/places/banyan-tree'

/**
 * Hand-written page content for places that deserve more than the generated
 * copy in place-content.ts.
 *
 * That generator can only describe a place in terms of the fields Google
 * returns — rating, hours, amenities, how it ranks among its neighbours. For an
 * ordinary municipal park that is genuinely all there is to say. For a landmark
 * someone searched out by name it is thin: the reasons a person is on the page
 * (what the place is, how to find it, what it has been in) live in no API
 * field. This is where those go.
 *
 * Content lives in the repo rather than Firestore on purpose. It is reviewed in
 * pull requests, costs no document reads, and cannot be clobbered by
 * `npm run ingest` or `npm run restore`, both of which rewrite whole documents.
 */

/**
 * A hand-picked Commons photo. `npm run photos:places` can only match a file
 * whose title names the place, and it keeps just one — for a landmark worth
 * writing about by hand, the pictures are worth choosing by eye too.
 */
export type EditorialPhoto = {
  photo: Photo
  /** Visible caption, and the image's alt text. */
  caption: string
}

export type EditorialSection = {
  heading: string
  /** One paragraph per entry. Plain text — no markup is parsed. */
  body: string[]
}

export type PlaceEditorial = {
  /**
   * Overrides the meta description, which otherwise falls back to Google's
   * one-line editorial summary or a filled-in template. Keep it near 155
   * characters so it survives to the end in a search result.
   */
  metaDescription?: string
  /** Replaces the generated intro paragraphs under "About". */
  lede: string[]
  sections: EditorialSection[]
  /**
   * The first is the page hero, ahead of anything `placePhoto` would find; the
   * rest render as a gallery. Each one's licence is shown next to it, so only
   * use licences that permit reuse with attribution.
   */
  photos?: EditorialPhoto[]
  /** Shown before the generated questions, and mirrored into FAQPage JSON-LD. */
  faqs?: Faq[]
  /** Rendered as a provenance line under the content. */
  sources?: { label: string; url: string }[]
  /** ISO date (YYYY-MM-DD), rendered as "Last reviewed". */
  updated: string
}

const EDITORIAL: Record<string, PlaceEditorial> = {
  'banyan-tree': banyanTree,
}

export function getEditorial(slug: string): PlaceEditorial | null {
  return EDITORIAL[slug] ?? null
}

export function hasEditorial(slug: string): boolean {
  return slug in EDITORIAL
}
