/** Shared by the snapshot script and the data layer so they cannot drift. */
export const SNAPSHOT_PATH = '.allparx-cache/places.json'

/** Written into public/ by the snapshot script; fetched by the search page. */
export const SEARCH_INDEX_FILE = 'search-index.json'

/** Same, for /near-me. Kept apart from the search index so the search box's
 *  first-keystroke download doesn't pay for coordinates it never uses. */
export const NEAR_INDEX_FILE = 'near-index.json'
