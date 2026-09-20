import type { EditorialPhoto } from './place-editorial'

/**
 * Hotels AllParx writes about and takes stay enquiries for.
 *
 * Why this is separate from `places`: a Firestore place document is whatever
 * the Google Places sweep returned for an outdoor spot, and `npm run ingest`
 * rewrites it wholesale. A hotel here is the opposite — every factual field is
 * pinned to a dated Places lookup that a human ran and read, and everything
 * else is hand-written and reviewed in a pull request. Nothing on these pages
 * is generated at request time.
 *
 * **AllParx is not affiliated with any of these brands.** These are
 * independent write-ups. The enquiry form sends a request to AllParx, not to
 * the hotel, and every page links to the operator's own site so a reader who
 * wants to book direct can. Nothing here may be presented as an official
 * booking channel, and no review text is ever written by us — the only ratings
 * shown are Google's aggregate, with the count and the date they were read.
 */
export type Hotel = {
  slug: string
  /** The operator's official name, exactly as Google Places returns it. */
  name: string
  /** Brand line, for grouping on the hub page. */
  brand: 'Banyan Tree' | 'The Ritz-Carlton'
  /** Short location label: "Phuket, Thailand". */
  where: string
  country: string
  /** One line under the name in cards and the hero. */
  tagline: string

  // --- Fields below are Google Places data, not ours. -----------------------
  googlePlaceId: string
  address: string
  lat: number
  lng: number
  /** Google's aggregate rating. Never a review we wrote. */
  rating: number
  reviewCount: number
  /** Google's own one-line summary, where it has one. */
  googleSummary: string | null
  /** The operator's site. Always linked, so booking direct stays one click. */
  website: string
  phone: string
  /** ISO date the Places lookup above was run and checked. */
  factsAsOf: string

  // --- Hand-written. --------------------------------------------------------
  lede: string[]
  sections: { heading: string; body: string[] }[]
  /** Shown as a short list beside the enquiry form. */
  goodToKnow: string[]
  /** First is the hero; the rest are a gallery. */
  photos: EditorialPhoto[]
  updated: string
}

import phuket from '@/content/hotels/banyan-tree-phuket'
import bangkok from '@/content/hotels/banyan-tree-bangkok'
import bintan from '@/content/hotels/banyan-tree-bintan'
import turtleBay from '@/content/hotels/ritz-carlton-oahu-turtle-bay'

/**
 * Order matters: this is the order of the cards on /places/banyan-tree, and
 * the Banyan Tree properties lead because that is what the page is about.
 */
export const HOTELS: Hotel[] = [phuket, bangkok, bintan, turtleBay]

export function getHotel(slug: string): Hotel | null {
  return HOTELS.find((hotel) => hotel.slug === slug) ?? null
}

export function hotelsByBrand(brand: Hotel['brand']): Hotel[] {
  return HOTELS.filter((hotel) => hotel.brand === brand)
}

/** The disclosure that has to appear on every page carrying a hotel enquiry. */
export const AFFILIATION_NOTICE =
  'AllParx is an independent directory and is not affiliated with, endorsed by ' +
  'or acting as a booking agent for any hotel or brand listed here. Sending an ' +
  'enquiry does not reserve a room. We will reply by email to help you plan, ' +
  'and you can always book direct with the hotel.'
