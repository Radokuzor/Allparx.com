/**
 * The list a visitor last opened a place from — near-me results, a category
 * page, search results — so the place page can step to the previous or next
 * one in that same list.
 *
 * Kept in sessionStorage: it belongs to this tab's browsing, and when storage
 * is blocked the place page simply falls back to its own neighbours.
 */

export type BrowseItem = { slug: string; name: string }
export type BrowseList = { label: string; items: BrowseItem[] }

const STORAGE_KEY = 'allparx:browse'

/** Near-me can return well over a thousand places; nobody steps that far. */
const MAX_ITEMS = 400

export function rememberList(label: string, items: BrowseItem[]) {
  try {
    const list: BrowseList = { label, items: items.slice(0, MAX_ITEMS) }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Storage blocked: the place page falls back to same-city neighbours.
  }
}

/** The stored list as a string — stable between reads, for useSyncExternalStore. */
export function readRawList(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function parseList(raw: string | null): BrowseList | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<BrowseList>
    return typeof value.label === 'string' && Array.isArray(value.items)
      ? { label: value.label, items: value.items }
      : null
  } catch {
    return null
  }
}
