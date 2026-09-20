/**
 * Places whose published URL is not their Firestore document id.
 *
 * `/places/banyan-tree` was given over to the hotel hub, so the Kawela Bay
 * banyan that used to live there now publishes at a longer, more specific URL.
 * Only the address moves: the document keeps its original id because
 * `npm run ingest`, `npm run restore` and the legacy-slug recovery all key on
 * it, and re-keying the collection to change one URL would put every one of
 * those out of step.
 *
 * The data layer swaps the id for the published slug on the way out, so
 * everything downstream — canonical tags, cards, the sitemap, JSON-LD — uses
 * the published URL without knowing this file exists.
 */
const PUBLISHED_TO_DOC: Record<string, string> = {
  'banyan-tree-kawela-bay-oahu': 'banyan-tree',
}

const DOC_TO_PUBLISHED: Record<string, string> = Object.fromEntries(
  Object.entries(PUBLISHED_TO_DOC).map(([published, doc]) => [doc, published]),
)

/** Published URL slug → the Firestore document id to read. */
export function docSlug(published: string): string {
  return PUBLISHED_TO_DOC[published] ?? published
}

/** Firestore document id → the slug the site publishes it at. */
export function publishedSlug(doc: string): string {
  return DOC_TO_PUBLISHED[doc] ?? doc
}

/** True when this document id is published somewhere other than its own id. */
export function isAliased(doc: string): boolean {
  return doc in DOC_TO_PUBLISHED
}
