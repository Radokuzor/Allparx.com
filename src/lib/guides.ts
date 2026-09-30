import type { Faq } from './place-content'
import { PLACE_TYPES, typeLabel, typeLabelPlural } from './place-types'
import type { Place } from './types'
import { US_STATE_NAMES } from './us-states'

/**
 * Ranked guides: "Best Campgrounds in Austin, TX", "Dog-Friendly Parks in
 * Chicago, IL", and — where the data genuinely spans a state — "Best Hiking
 * Trails in Colorado".
 *
 * These answer the searches a single place page can't — someone choosing
 * *between* places — and every word is derived from listing data, the same
 * rule place-content.ts follows. A guide only exists when an area holds
 * enough rated places to make a ranking honest (MIN_PLACES), so the set of
 * pages grows by itself as ingestion adds places.
 *
 * Ingestion sweeps metros, not whole states, so a state often means one city.
 * A state guide is only built when its places span MIN_STATE_CITIES cities;
 * otherwise "Best Beaches in California" would really be "in Los Angeles".
 *
 * Pure functions over the place list; the route renders them at build time.
 */

export type GuideKind = 'best' | 'dogs' | 'kids'

export type Guide = {
  slug: string
  kind: GuideKind
  state: string
  stateName: string
  /** Null for a state-wide guide. */
  city: string | null
  /** "Austin, TX" or "Colorado" — what the heading says the guide covers. */
  area: string
  placeType: string
  title: string
  /** Meta description, kept near 155 characters. */
  description: string
  intro: string[]
  entries: GuideEntry[]
  faqs: Faq[]
}

export type GuideEntry = { place: Place; blurb: string }

/** Below this many ranked places a "best of" list is a directory listing with a headline. */
const MIN_PLACES = 5
const MIN_STATE_CITIES = 3
const MAX_ENTRIES = 20
/** A place needs this many reviews before its rating says anything. */
const MIN_REVIEWS = 5

// Rating is shrunk toward PRIOR_RATING by PRIOR_WEIGHT phantom reviews, so a
// 5.0 from six people doesn't outrank a 4.8 from two thousand.
const PRIOR_RATING = 4.2
const PRIOR_WEIGHT = 25

const KIND: Record<GuideKind, { prefix: string; slug: string; keeps: (p: Place) => boolean; skip: string[] }> = {
  best: { prefix: 'Best', slug: 'best', keeps: () => true, skip: [] },
  // A dog-friendly dog park and a family-friendly playground say nothing.
  dogs: { prefix: 'Dog-Friendly', slug: 'dog-friendly', keeps: (p) => p.allowsDogs === true, skip: ['dog_park'] },
  kids: {
    prefix: 'Family-Friendly',
    slug: 'family-friendly',
    keeps: (p) => p.goodForChildren === true,
    skip: ['playground'],
  },
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function score(place: Place): number {
  const rating = place.rating ?? 0
  return (rating * place.reviewCount + PRIOR_RATING * PRIOR_WEIGHT) / (place.reviewCount + PRIOR_WEIGHT)
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`
}

export function guideSlug(kind: GuideKind, placeType: string, state: string, city: string | null): string {
  const area = city ? `${city}-${state}` : (US_STATE_NAMES[state] ?? state)
  return `${KIND[kind].slug}-${slugify(typeLabelPlural(placeType))}-in-${slugify(area)}`
}

function blurb(place: Place, rank: number, kind: GuideKind, cityWide: boolean): string {
  const parts: string[] = []
  // In a city guide every entry shares the city, so naming it is noise.
  const where = cityWide ? '' : ` in ${place.city}`
  const reviews = plural(place.reviewCount, 'review', 'reviews')
  if (rank === 0) {
    parts.push(`The top pick${where}, holding ${place.rating} stars across ${reviews}.`)
  } else if (place.reviewCount >= 500) {
    parts.push(`${place.rating} stars from ${reviews}${where}, one of the most reviewed on this list.`)
  } else {
    parts.push(`Rated ${place.rating} from ${reviews}${where}.`)
  }

  const has: string[] = []
  if (kind !== 'dogs' && place.allowsDogs) has.push('dogs welcome')
  if (kind !== 'kids' && place.goodForChildren) has.push('good for kids')
  if (place.hasRestroom) has.push('restrooms')
  if (place.parking && Object.values(place.parking).some(Boolean)) has.push('parking on site')
  if (has.length > 0) parts.push(`${list(has).replace(/^./, (c) => c.toUpperCase())}.`)

  if (place.hours.some((line) => /open 24 hours/i.test(line))) parts.push('Open around the clock.')
  return parts.join(' ')
}

function ranked(pool: Place[]): Place[] {
  return pool
    .filter((p) => p.rating !== null && p.reviewCount >= MIN_REVIEWS)
    .sort((a, b) => score(b) - score(a))
}

function build(kind: GuideKind, placeType: string, state: string, city: string | null, top: Place[]): Guide {
  const stateName = US_STATE_NAMES[state] ?? state
  const area = city ? `${city}, ${state}` : stateName
  const label = typeLabelPlural(placeType)
  const lower = label.toLowerCase()
  const one = typeLabel(placeType).toLowerCase()
  const prefix = KIND[kind].prefix
  const [first, second] = top
  const cities = [...new Set(top.map((p) => p.city))]
  const reviews = top.reduce((sum, p) => sum + p.reviewCount, 0)
  const average = top.reduce((sum, p) => sum + (p.rating ?? 0), 0) / top.length
  const count = top.length
  const at = (p: Place) => (city ? p.name : `${p.name} in ${p.city}`)

  const lead =
    kind === 'best'
      ? `These are the ${count} highest-rated ${lower} we list in ${area}, ranked by what visitors actually say about them.`
      : kind === 'dogs'
        ? `Every one of these ${count} ${lower} in ${area} is listed as allowing dogs, ranked by visitor ratings.`
        : `These ${count} ${lower} in ${area} are all flagged as good for children, ranked by visitor ratings.`

  const leader = `${at(first)} leads, with ${first.rating} stars from ${first.reviewCount.toLocaleString()} reviews${
    second ? `; ${at(second)} follows at ${second.rating}` : ''
  }.`
  const spread = city
    ? ''
    : ` The list spans ${plural(cities.length, 'city', 'cities')}, including ${list(cities.slice(0, 4))}.`

  const method =
    `Between them they carry ${reviews.toLocaleString()} Google reviews and average ${average.toFixed(1)} stars. ` +
    'We weigh a rating by how many people left it, so a place with a handful of five-star reviews does not leapfrog one that thousands have rated nearly as well.'

  const dogs = top.filter((p) => p.allowsDogs)
  const kids = top.filter((p) => p.goodForChildren)
  const restrooms = top.filter((p) => p.hasRestroom).length
  const names = (places: Place[]) =>
    `${list(places.slice(0, 5).map((p) => p.name))}${places.length > 5 ? ', among others,' : ''}`

  const faqs: Faq[] = [
    {
      question: `What is the best ${kind === 'best' ? '' : `${prefix.toLowerCase()} `}${one} in ${area}?`,
      answer: `${at(first)} ranks first, with ${first.rating} out of 5 stars from ${first.reviewCount.toLocaleString()} Google reviews.`,
    },
  ]
  if (!city) {
    const byCity = new Map<string, number>()
    for (const p of top) byCity.set(p.city, (byCity.get(p.city) ?? 0) + 1)
    const [busiest, n] = [...byCity.entries()].sort((a, b) => b[1] - a[1])[0]
    if (n > 1) {
      faqs.push({
        question: `Which city in ${stateName} has the most top-rated ${lower}?`,
        answer: `${busiest} has ${n} of the ${count} ${lower} on this list.`,
      })
    }
  }
  if (kind !== 'dogs' && dogs.length > 0) {
    faqs.push({
      question: `Which ${lower} in ${area} allow dogs?`,
      answer: `${names(dogs)} ${dogs.length === 1 ? 'is' : 'are'} listed as dog-friendly.`,
    })
  }
  if (kind !== 'kids' && kids.length > 0) {
    faqs.push({
      question: `Which ${lower} in ${area} are good for kids?`,
      answer: `${names(kids)} ${kids.length === 1 ? 'is' : 'are'} flagged as family-friendly.`,
    })
  }
  if (restrooms > 0) {
    faqs.push({
      question: `Do these ${lower} have restrooms?`,
      answer: `${restrooms} of the ${count} list restrooms on site. Check each place's page before you go, since facilities can close seasonally.`,
    })
  }

  const best = prefix === 'Best' ? 'best' : `best ${prefix.toLowerCase()}`
  return {
    slug: guideSlug(kind, placeType, state, city),
    kind,
    state,
    stateName,
    city,
    area,
    placeType,
    title: `${prefix} ${label} in ${area}`,
    description: `The ${count} ${best} ${lower} in ${area}, ranked by ${reviews.toLocaleString()} visitor reviews. ${first.name} leads. See ratings, amenities and directions.`,
    intro: [lead, `${leader}${spread}`, method],
    entries: top.map((place, i) => ({ place, blurb: blurb(place, i, kind, city !== null) })),
    faqs,
  }
}

/** Every guide the data supports. Deterministic, so build and request agree. */
export function buildGuides(places: Place[]): Guide[] {
  const groups = new Map<string, Place[]>()
  for (const place of places) {
    if (!place.state || !US_STATE_NAMES[place.state]) continue
    if (!(PLACE_TYPES as readonly string[]).includes(place.placeType)) continue
    // Each place lands in its state-wide group and its city group.
    for (const key of [`${place.state}|${place.placeType}|`, `${place.state}|${place.placeType}|${place.city}`]) {
      const group = groups.get(key)
      if (group) group.push(place)
      else groups.set(key, [place])
    }
  }

  const out: Guide[] = []
  for (const [key, group] of groups) {
    const [state, placeType, cityPart] = key.split('|')
    const city = cityPart || null
    for (const kind of Object.keys(KIND) as GuideKind[]) {
      if (KIND[kind].skip.includes(placeType)) continue
      const top = ranked(group.filter(KIND[kind].keeps)).slice(0, MAX_ENTRIES)
      if (top.length < MIN_PLACES) continue
      if (!city && new Set(top.map((p) => p.city)).size < MIN_STATE_CITIES) continue
      out.push(build(kind, placeType, state, city, top))
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

/** Guides that rank this place, for "featured in" links on its page. */
export function guidesFeaturing(guides: Guide[], slug: string): Guide[] {
  return guides.filter((guide) => guide.entries.some((entry) => entry.place.slug === slug))
}

/** Same area's other categories first, then the same category elsewhere in the state. */
export function relatedGuides(guides: Guide[], guide: Guide, limit = 8): Guide[] {
  const others = guides.filter((g) => g.slug !== guide.slug && g.kind === 'best' && g.state === guide.state)
  const sameArea = others.filter((g) => g.city === guide.city)
  const sameType = others.filter((g) => g.placeType === guide.placeType && g.city !== guide.city)
  const rest = others.filter((g) => !sameArea.includes(g) && !sameType.includes(g))
  return [...sameArea, ...sameType, ...rest].slice(0, limit)
}
