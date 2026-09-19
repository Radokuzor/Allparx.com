import type { Place } from './types'
import { typeLabel, typeLabelPlural } from './place-types'

/**
 * Editorial layer for the place detail pages.
 *
 * Google gives us at most a one-line editorial summary, and only for a third
 * of the collection, which left most pages as a heading and a map. Everything
 * here is *derived* — from rating, review volume, amenity flags, parking,
 * opening hours and the place's standing among its neighbours — so a page
 * never asserts something the data does not support. Category copy is the one
 * exception: it describes what visiting that kind of place is generally like,
 * which is true of the category rather than of the individual listing.
 *
 * Pure functions over a `Place`, so this all runs at build time and costs
 * nothing at request time.
 */

export type Insight = {
  /** Key mapped to a lucide icon by the page, so this file stays icon-library agnostic. */
  icon: string
  title: string
  body: string
}

export type Faq = { question: string; answer: string }

export type PlaceContext = {
  /** Same city, same category, best-rated first — used for ranking and pairing suggestions. */
  peers: Place[]
}

// --- Category copy ---------------------------------------------------------

type CategoryProfile = {
  /** What a visit to this kind of place usually involves. */
  visit: string
  /** Who the category tends to suit — completes "a good fit for …". */
  suits: string
  /** Practical timing advice for the category. */
  timing: string
  /** Three things worth having with you. */
  bring: string[]
}

const CATEGORY: Record<string, CategoryProfile> = {
  park: {
    visit:
      'Open lawns, paths and benches — the kind of place that works for a twenty-minute break or a whole afternoon, depending on what you bring with you.',
    suits: 'walkers, picnickers and anyone after a green pause from the surrounding blocks',
    timing: 'Mornings are the quietest stretch; the lawns fill up in the hours before sunset.',
    bring: ['Water', 'A blanket or folding chair', 'Sunscreen on clear days'],
  },
  dog_park: {
    visit:
      'A fenced run where dogs are typically off-leash and owners end up talking to each other whether they planned to or not.',
    suits: 'dog owners who want off-leash time without driving across town',
    timing:
      'Before and after work are the busiest, most social windows. Midday is calmer if your dog prefers space.',
    bring: [
      'Water and a collapsible bowl',
      'Waste bags',
      'Vaccination records if the run is permit-gated',
    ],
  },
  campground: {
    visit:
      'Sites for tents or vehicles, usually with a fire ring at each one and a shared washhouse somewhere on the loop.',
    suits: 'overnighters who would rather have a base camp than a hotel room',
    timing:
      'Summer weekends and holidays book out well ahead; midweek nights open up far more easily.',
    bring: ['Your reservation details', 'Layers for the drop after dark', 'Headlamp and firewood'],
  },
  hiking_area: {
    visit:
      'Marked trails that can run from a short loop to a half-day out, with the trailhead as the only real commitment.',
    suits: 'hikers and trail runners looking for a route close to town',
    timing: 'Start early — trailhead parking is the first thing to disappear on a good weekend.',
    bring: [
      'More water than feels necessary',
      'Shoes with grip',
      'A downloaded map — signal thins out',
    ],
  },
  beach: {
    visit: 'Sand, water, and however much shade you thought to bring with you.',
    suits: 'swimmers, sunbathers and families willing to haul a cooler',
    timing:
      'Weekday mornings are the sweet spot. Check the tide and the lifeguard schedule before you swim.',
    bring: ['Towel and sunscreen', 'Cash or an app for parking', 'Water — concessions are seasonal'],
  },
  rv_park: {
    visit: 'Hookup sites with power, water and dump access, plus the usual laundry-and-showers block.',
    suits: 'RV and van travellers who need a serviced overnight stop',
    timing:
      'Call ahead about rig length limits and seasonal rates — both vary more than listings suggest.',
    bring: ['Hookup adapters', 'Levelling blocks', 'Your rig length and reservation'],
  },
  national_park: {
    visit: 'Protected land at a scale that rewards a full day rather than a quick stop.',
    suits: 'travellers planning a day around one big landscape',
    timing:
      'Arrive before mid-morning in peak season — visitor centres and the popular pullouts fill first.',
    bring: ['Entrance pass or payment', 'Food and water for the day', 'Offline maps'],
  },
  state_park: {
    visit:
      'State-managed land that usually folds trails, picnic areas and some kind of water access into one place.',
    suits: 'day-trippers who want variety without a long drive',
    timing: 'Weekdays skip the day-use queue. Check the park website for seasonal closures.',
    bring: ['Cash or card for day-use fees', 'Picnic supplies', 'Bug spray in warm months'],
  },
  wildlife_refuge: {
    visit:
      'Habitat first, visitors second — expect boardwalks, blinds and firm rules about staying on the path.',
    suits: 'birders and anyone who likes a slow, quiet walk',
    timing: 'Dawn and dusk are when the wildlife is actually out, and migration season is the payoff.',
    bring: ['Binoculars', 'Muted clothing', 'Patience'],
  },
  sports_complex: {
    visit:
      'Fields and courts on a booking schedule, with league play claiming most of the prime slots.',
    suits: 'teams, leagues and pickup players',
    timing:
      'Confirm whether the fields are open to drop-in play before you go — leagues tend to own evenings and weekends.',
    bring: ['Your own gear', 'Booking confirmation', 'Water — fountains are hit or miss'],
  },
  community_center: {
    visit:
      'Indoor programming — classes, a gym, courts, meeting rooms — usually behind a membership or a drop-in fee.',
    suits: 'regulars who want indoor space that works year-round',
    timing: 'Schedules rotate by season, so confirm the class or open-gym block before heading over.',
    bring: ['ID or membership card', 'Indoor shoes', 'A lock for the changing room'],
  },
  picnic_ground: {
    visit: 'Tables, grills and shade set aside for exactly one purpose: eating outside.',
    suits: 'groups, birthdays and anyone tired of eating indoors',
    timing:
      'Unless sites are reservable, they go first-come on good-weather weekends. Arrive before noon.',
    bring: ['Charcoal and a lighter if you plan to grill', 'Trash bags', 'A cloth for the table'],
  },
  fishing_pond: {
    visit: 'Shoreline or dock access for casting, with the catch depending entirely on the season.',
    suits: 'anglers after a spot they can reach on a weeknight',
    timing:
      'First light and the last hour of it are the productive windows. Check local regulations and limits first.',
    bring: ['A valid fishing licence', 'Tackle suited to the water', 'A bucket and somewhere to sit'],
  },
  garden: {
    visit:
      'Planted grounds built for a slow loop — paths, labelled beds, and a bench roughly when you need one.',
    suits: 'plant people, photographers and anyone wanting a calm hour',
    timing: 'Peak bloom is the whole point and it moves by species — check what is flowering first.',
    bring: ['A camera', 'Comfortable shoes', 'Admission money if the garden is ticketed'],
  },
  marina: {
    visit:
      'Slips, docks and the boardwalk that comes with them — worth the walk even if you do not own a boat.',
    suits: 'boaters, and anyone who likes a waterfront to walk along',
    timing: 'Summer weekends are lively; off-season mornings are quiet and far more photogenic.',
    bring: ['A layer — it is windier on the water', 'Deck shoes', 'Slip details if you are berthing'],
  },
  playground: {
    visit: 'Play equipment, plus the benches that make it survivable for the adults.',
    suits: 'families with young kids',
    timing:
      'After school and weekend mornings are peak chaos. Mid-morning on a weekday is close to empty.',
    bring: ['Water and snacks', 'Sunscreen', 'Wipes'],
  },
  swimming_pool: {
    visit: 'Lap lanes, open swim, or both, on a posted schedule that shifts with the season.',
    suits: 'swimmers and families looking to cool off',
    timing:
      'Lap-swim and open-swim hours are separate blocks — confirm the one you want before you drive over.',
    bring: ['Suit, towel and goggles', 'A lock for the lockers', 'Cash or card for the day fee'],
  },
  skateboard_park: {
    visit:
      'Concrete bowls, ledges and rails, shared by skaters, BMX riders and scooters depending on the posted rules.',
    suits: 'skaters at every level, plus the parents watching from the edge',
    timing:
      'Sessions build after school and hold until dark. Early morning is the best time to learn without an audience.',
    bring: ['Helmet and pads', 'Spare hardware', 'Water'],
  },
}

const CATEGORY_FALLBACK: CategoryProfile = {
  visit: 'An outdoor spot worth a look when you are already in the area.',
  suits: 'anyone looking for somewhere new nearby',
  timing: 'Weekday visits are usually the quietest.',
  bring: ['Water', 'Comfortable shoes', 'Sunscreen on clear days'],
}

function categoryProfile(place: Place): CategoryProfile {
  return CATEGORY[place.placeType] ?? CATEGORY_FALLBACK
}

/** Categories whose usefulness swings hard with the calendar, and why. */
const SEASONAL_NOTE: Record<string, string> = {
  beach:
    'Swimming season, lifeguard cover and concessions are all warm-weather only. Out of season this is a windy walk — which may be exactly what you are after, but go in knowing it.',
  swimming_pool:
    'Outdoor pools shut for the cold months and indoor timetables shrink around them. Confirm the season, not just the hours.',
  campground:
    'Plenty of sites close or cut services outside the main season, and winter camping here is a different proposition entirely.',
  marina:
    'Boats come out of the water off-season, so both the services and the atmosphere thin right out.',
  fishing_pond:
    'What is biting — and whether the season is open at all — shifts through the year. Check current local regulations before you load the car.',
  garden:
    'What is in bloom drives the whole visit. In winter this is a barer, much quieter place than the photographs suggest.',
}

// --- Small derivations -----------------------------------------------------

/** Stable per-slug seed, so a page picks the same phrasing on every build. */
function seed(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  return hash
}

function pick<T>(slug: string, options: T[]): T {
  return options[seed(slug) % options.length]
}

type Hours = {
  closedDays: string[]
  openDays: string[]
  openEveryDay: boolean
  allDay: boolean
  /** The schedule shared by every open day, e.g. "9:00 AM - 7:00 PM"; null when days differ. */
  uniform: string | null
  /** 24-hour opening and closing hour of `uniform`, when it parses. */
  window: { opens: number; closes: number } | null
}

/** "6:00 AM" -> 6, "10:00 PM" -> 22, "12:00 AM" -> 0. */
function clockHour(text: string): number | null {
  const match = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(text)
  if (!match) return null
  const hour = Number(match[1]) % 12
  return /pm/i.test(match[3]) ? hour + 12 : hour
}

function readHours(place: Place): Hours | null {
  if (place.hours.length === 0) return null

  const entries = place.hours.map((line) => {
    const split = line.indexOf(':')
    return { day: line.slice(0, split), value: line.slice(split + 1).trim() }
  })
  const closed = entries.filter((e) => /closed/i.test(e.value))
  const open = entries.filter((e) => !/closed/i.test(e.value))
  const schedules = new Set(open.map((e) => e.value))
  const uniform = schedules.size === 1 ? [...schedules][0] : null

  // Google writes the range with an en dash; split on either dash form.
  const parts = uniform?.split(/[–-]/) ?? []
  const opens = parts.length === 2 ? clockHour(parts[0]) : null
  const closes = parts.length === 2 ? clockHour(parts[1]) : null

  return {
    closedDays: closed.map((e) => e.day),
    openDays: open.map((e) => e.day),
    openEveryDay: closed.length === 0,
    allDay: open.length > 0 && open.every((e) => /24 hours/i.test(e.value)),
    uniform,
    window: opens !== null && closes !== null ? { opens, closes } : null,
  }
}

type Parking = { free: boolean; paid: boolean; labels: string[]; freeLabels: string[] }

const PARKING_LABELS: Record<string, string> = {
  freeParkingLot: 'a free lot',
  freeStreetParking: 'free street parking',
  freeGarageParking: 'a free garage',
  paidParkingLot: 'a paid lot',
  paidStreetParking: 'metered street parking',
  paidGarageParking: 'a paid garage',
  valetParking: 'valet',
}

function readParking(place: Place): Parking | null {
  if (!place.parking) return null
  const available = Object.entries(place.parking)
    .filter(([, value]) => value)
    .map(([key]) => key)
  if (available.length === 0) return null

  const label = (key: string) => PARKING_LABELS[key] ?? key
  return {
    free: available.some((key) => key.startsWith('free')),
    paid: available.some((key) => key.startsWith('paid') || key === 'valetParking'),
    labels: available.map(label),
    freeLabels: available.filter((key) => key.startsWith('free')).map(label),
  }
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Joins with commas and a trailing "and". */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * 1-based standing among same-city, same-category places by rating. Returned
 * only when the field is big enough for a rank to mean anything and the place
 * actually lands near the top of it.
 */
function cityRank(place: Place, peers: Place[]): { rank: number; of: number } | null {
  if (place.rating === null) return null
  const field = [place, ...peers].filter((p) => p.rating !== null)
  if (field.length < 4) return null

  const sorted = [...field].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  const rank = sorted.findIndex((p) => p.slug === place.slug) + 1
  const cutoff = Math.max(3, Math.ceil(field.length * 0.2))
  return rank > 0 && rank <= cutoff ? { rank, of: field.length } : null
}

function ordinal(n: number): string {
  const teens = n % 100 >= 11 && n % 100 <= 13
  const suffix = teens ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${suffix}`
}

function where(place: Place): string {
  return place.state ? `${place.city}, ${place.state}` : place.city
}

/** Lowercases a type label for mid-sentence use, but leaves acronyms alone ("RV Park" -> "RV park"). */
function lower(label: string): string {
  return label
    .split(' ')
    .map((word) => (word === word.toUpperCase() && word.length > 1 ? word : word.toLowerCase()))
    .join(' ')
}

function typeName(type: string): string {
  return lower(typeLabel(type))
}

function typeNamePlural(type: string): string {
  return lower(typeLabelPlural(type))
}

/**
 * Street line only, for prose. Google's `address` is a full formatted string
 * that repeats the city, state and country we have just said, and sometimes
 * opens with the place's own name — both read badly mid-sentence.
 */
function streetLine(place: Place): string | null {
  const street = place.address.split(',')[0]?.trim()
  if (!street) return null
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  return normalise(street) === normalise(place.name) ? null : street
}

// --- The About section -----------------------------------------------------

/**
 * Two or three paragraphs. The first is Google's editorial line when there is
 * one, otherwise a plain statement of what the listing is; the rest build on
 * the category and on whatever the record actually knows.
 */
export function intro(place: Place, context: PlaceContext): string[] {
  const label = typeName(place.placeType)
  const plural = typeNamePlural(place.placeType)
  const hours = readHours(place)
  const parking = readParking(place)
  const rank = cityRank(place, context.peers)
  const street = streetLine(place)
  const at = street ? `, at ${street}` : ''

  const opening =
    place.description ??
    pick(place.slug, [
      `${place.name} is a ${label} in ${where(place)}${at}.`,
      `${place.name} sits in ${where(place)} as one of the city's ${plural}${at}.`,
      `You will find ${place.name} in ${where(place)}${at}, listed here as a ${label}.`,
    ])

  const middle: string[] = []

  if (place.rating !== null && place.reviewCount >= 10) {
    const verdict =
      place.rating >= 4.6
        ? 'Visitors rate it highly'
        : place.rating >= 4.2
          ? 'Reviews lean positive'
          : place.rating >= 3.7
            ? 'Reviews are solid if not glowing'
            : 'Reviews are mixed'
    middle.push(
      `${verdict} — ${place.rating} out of 5 across ${place.reviewCount.toLocaleString()} Google reviews.`,
    )
  } else if (place.rating !== null) {
    middle.push(
      `It carries a ${place.rating} rating, though only ${place.reviewCount} ${
        place.reviewCount === 1 ? 'person has' : 'people have'
      } weighed in — a small sample to read much into.`,
    )
  } else {
    middle.push('Nobody has rated it on Google yet, so it remains something of an unknown.')
  }

  if (rank) {
    middle.push(
      `That puts it ${ordinal(rank.rank)} of the ${rank.of} rated ${plural} we list in ${place.city}.`,
    )
  }

  const closing: string[] = []

  if (hours?.allDay) {
    closing.push('The gates never close, so an early run and a late walk are both on the table.')
  } else if (hours?.uniform && hours.openEveryDay) {
    closing.push(`It keeps the same hours every day — ${hours.uniform} — which makes planning simple.`)
  } else if (hours && hours.closedDays.length >= 4) {
    closing.push(`It opens on ${list(hours.openDays)} and stays shut the rest of the week.`)
  } else if (hours && hours.closedDays.length > 0) {
    closing.push(
      `Mind the closed ${hours.closedDays.length === 1 ? 'day' : 'days'}: ${list(hours.closedDays)}.`,
    )
  } else if (!hours) {
    closing.push(
      'No opening hours are published for this listing, which usually points to dawn-to-dusk access — worth confirming before a long trip.',
    )
  }

  if (parking) {
    closing.push(
      parking.free
        ? `Parking is the easy part: ${list(parking.labels)}.`
        : `Parking is ${list(parking.labels)}, so budget for it.`,
    )
  }

  if (context.peers.length >= 2) {
    closing.push(
      `And if it does not suit, ${context.peers.length} more ${plural} in ${place.city} are listed further down this page.`,
    )
  }

  const paragraphs = [opening, middle.join(' ')]
  if (closing.length > 0) paragraphs.push(closing.join(' '))
  return paragraphs
}

// --- Pros ------------------------------------------------------------------

export function highlights(place: Place, context: PlaceContext): Insight[] {
  const out: Insight[] = []
  const hours = readHours(place)
  const parking = readParking(place)
  const rank = cityRank(place, context.peers)
  const label = typeName(place.placeType)
  const plural = typeNamePlural(place.placeType)

  if (place.rating !== null && place.rating >= 4.6 && place.reviewCount >= 50) {
    out.push({
      icon: 'star',
      title: 'Consistently well reviewed',
      body: `${place.rating} stars held across ${place.reviewCount.toLocaleString()} reviews is not a fluke — people keep going back.`,
    })
  } else if (place.rating !== null && place.rating >= 4.3 && place.reviewCount < 50) {
    out.push({
      icon: 'compass',
      title: 'Under the radar',
      body: `Strong ratings from a small crowd (${place.reviewCount.toLocaleString()} reviews). Expect fewer people than the headline spots draw.`,
    })
  } else if (place.rating !== null && place.rating >= 4.2) {
    out.push({
      icon: 'star',
      title: 'Solid local standing',
      body: `A ${place.rating} average from ${place.reviewCount.toLocaleString()} reviews puts it comfortably above the middle of the pack.`,
    })
  }

  if (rank) {
    out.push({
      icon: 'trophy',
      title:
        rank.rank === 1
          ? `The best-rated in ${place.city}`
          : `${ordinal(rank.rank)} best-rated in ${place.city}`,
      body: `Measured against the ${rank.of} rated ${plural} we track in ${place.city}.`,
    })
  }

  if (place.reviewCount >= 1000) {
    out.push({
      icon: 'users',
      title: 'A genuine local landmark',
      body: `${place.reviewCount.toLocaleString()} reviews is the kind of number a place only reaches when the whole city knows it.`,
    })
  }

  if (hours?.allDay) {
    out.push({
      icon: 'clock',
      title: 'Open 24 hours',
      body: 'No gate times to work around — useful for sunrise starts and after-dark walks alike.',
    })
  } else if (hours?.openEveryDay) {
    out.push({
      icon: 'clock',
      title: 'Open every day',
      body: hours.uniform
        ? `The same hours all week (${hours.uniform}), so there is no schedule to memorise.`
        : 'No closed days on the schedule, though the hours shift through the week.',
    })
  }

  if (place.allowsDogs) {
    out.push({
      icon: 'dog',
      title: 'Dogs welcome',
      body:
        place.placeType === 'dog_park'
          ? 'A dedicated run, so the dog gets the main event rather than a tolerated corner of somewhere else.'
          : 'Listed as dog-friendly — bring the leash and waste bags anyway.',
    })
  }

  if (place.goodForChildren) {
    out.push({
      icon: 'baby',
      title: 'Works with kids',
      body: 'Flagged as family-friendly, which usually means room to run and somewhere for the adults to sit.',
    })
  }

  if (place.hasRestroom) {
    out.push({
      icon: 'bath',
      title: 'Restrooms on site',
      body: 'The difference between an hour here and a whole afternoon, especially with a group.',
    })
  }

  if (parking?.free) {
    out.push({
      icon: 'parking',
      title: 'Free parking',
      body: `${sentenceCase(list(parking.freeLabels))} — one less thing to pay for${
        parking.paid ? ', though paid options sit alongside it' : ''
      }.`,
    })
  }

  if (context.peers.length >= 3) {
    out.push({
      icon: 'map',
      title: 'Easy to pair with a second stop',
      body: `${context.peers.length} other ${plural} sit in the same city, so a wash-out here need not waste the trip.`,
    })
  }

  if (place.website) {
    out.push({
      icon: 'link',
      title: 'An official site to check first',
      body: `Whoever runs this ${label} posts schedules, closures and events there.`,
    })
  }

  return out.slice(0, 5)
}

// --- Cons ------------------------------------------------------------------

export function considerations(place: Place, context: PlaceContext): Insight[] {
  const out: Insight[] = []
  const hours = readHours(place)
  const parking = readParking(place)
  const plural = typeNamePlural(place.placeType)

  if (place.rating !== null && place.rating < 4 && place.reviewCount >= 10) {
    out.push({
      icon: 'alert',
      title: 'Reviews are mixed',
      body: `A ${place.rating} average over ${place.reviewCount.toLocaleString()} reviews sits below what most places in this category manage. Read a few before committing to a long drive.`,
    })
  }

  if (place.rating === null || place.reviewCount < 10) {
    out.push({
      icon: 'help',
      title: 'Thinly reviewed',
      body:
        place.reviewCount === 0
          ? 'No Google reviews at all yet, so nothing here is crowd-verified. Treat the details as a starting point.'
          : `Only ${place.reviewCount} ${
              place.reviewCount === 1 ? 'review' : 'reviews'
            }, which is too few to tell you much. Worth a call ahead.`,
    })
  }

  if (place.hasRestroom === false) {
    out.push({
      icon: 'bath',
      title: 'No restrooms listed',
      body: 'Plan around it — that alone can cap how long a visit with kids realistically lasts.',
    })
  }

  if (place.allowsDogs === false) {
    out.push({
      icon: 'dog',
      title: 'Dogs are not permitted',
      body: 'Leave them at home, or look at the dog parks listed for the same city instead.',
    })
  }

  if (place.goodForChildren === false) {
    out.push({
      icon: 'baby',
      title: 'Not aimed at young kids',
      body: 'Nothing here is flagged as child-oriented, so set expectations before bringing the family.',
    })
  }

  if (parking && !parking.free && parking.paid) {
    out.push({
      icon: 'parking',
      title: 'Parking costs money',
      body: `Only ${list(parking.labels)} ${
        parking.labels.length === 1 ? 'is' : 'are'
      } listed. Factor the fee in, or arrive by transit if you can.`,
    })
  } else if (!parking) {
    out.push({
      icon: 'parking',
      title: 'Parking is undocumented',
      body: 'No lot or street parking is recorded against this listing. Assume you are hunting for a kerbside spot.',
    })
  }

  if (hours && hours.closedDays.length >= 4) {
    out.push({
      icon: 'clock',
      title: `Open ${list(hours.openDays)} only`,
      body: `Shut the rest of the week, so there ${
        hours.openDays.length === 1 ? 'is one day' : `are ${hours.openDays.length} days`
      } to work with. Check the hours panel before you set out.`,
    })
  } else if (hours && hours.closedDays.length > 0) {
    out.push({
      icon: 'clock',
      title: `Closed ${list(hours.closedDays)}`,
      body: `Check the hours panel before you set out — ${
        hours.closedDays.length === 1 ? 'a single closed day is' : 'the closed days are'
      } easy to miss.`,
    })
  } else if (!hours) {
    out.push({
      icon: 'clock',
      title: 'Hours are not published',
      body: 'Google lists no opening times for this one. Daylight hours are the safe assumption.',
    })
  }

  if (!place.phone && !place.website) {
    out.push({
      icon: 'phone',
      title: 'No easy way to confirm',
      body: 'Neither a phone number nor a website is on file, so there is nobody to check with ahead of a visit.',
    })
  }

  if (place.reviewCount >= 1000) {
    out.push({
      icon: 'users',
      title: 'Popular enough to be busy',
      body: `${place.reviewCount.toLocaleString()} reviews cuts both ways. Weekend afternoons draw a crowd, so go early or go midweek if you want it quiet.`,
    })
  }

  // Only worth flagging when the window is genuinely tight: a late open, an
  // early close, or under eight hours a day.
  if (hours && !hours.allDay && hours.uniform && hours.window) {
    const { opens } = hours.window
    // Midnight closes parse as 0; treat a close at or before the open as next-day.
    const closes = hours.window.closes <= opens ? hours.window.closes + 24 : hours.window.closes
    const span = closes - opens

    let limitation = 'not much slack either side'
    if (opens >= 16) limitation = 'strictly an evening visit'
    else if (opens >= 12) limitation = 'nothing before the afternoon'
    else if (opens >= 9 && closes <= 18) limitation = 'it has to land inside the working day'
    else if (opens >= 9) limitation = 'an early start is out'
    else if (closes <= 18) limitation = 'an evening visit is out'

    if (opens >= 9 || closes <= 18 || span < 8) {
      out.push({
        icon: 'clock',
        title: 'A narrow window to fit it in',
        body: `Open ${hours.uniform} and no longer — ${limitation}.`,
      })
    }
  }

  if (SEASONAL_NOTE[place.placeType]) {
    out.push({
      icon: 'alert',
      title: 'Strongly seasonal',
      body: SEASONAL_NOTE[place.placeType],
    })
  }

  if (context.peers.length === 0) {
    out.push({
      icon: 'map',
      title: 'The only one of its kind here',
      body: `We list no other ${plural} in ${place.city}, so there is no fallback close by if it disappoints.`,
    })
  }

  return out.slice(0, 4)
}

// --- Plan your visit -------------------------------------------------------

export type VisitPlan = { expect: string; suits: string; timing: string; bring: string[] }

/**
 * Category-level expectations, adjusted by what this listing records. Kept out
 * of the About prose because it describes the category rather than the place —
 * the page labels it as such.
 */
export function visitPlan(place: Place): VisitPlan {
  const profile = categoryProfile(place)
  const hours = readHours(place)
  const bring = [...profile.bring]

  if (place.allowsDogs && !bring.some((item) => /waste bag/i.test(item))) {
    bring.push('Leash and waste bags')
  }
  if (place.hasRestroom === false) bring.push('A plan for the missing restrooms')
  if (hours?.allDay) bring.push('A light if you are going after dark')

  const timing = hours?.allDay
    ? `${profile.timing} With 24-hour access, the quiet end of the day is genuinely available to you.`
    : hours?.uniform
      ? `${profile.timing} The gates are open ${hours.uniform}.`
      : profile.timing

  return { expect: profile.visit, suits: profile.suits, timing, bring: bring.slice(0, 5) }
}

// --- FAQ -------------------------------------------------------------------

/**
 * Only questions the record can actually answer. Feeds both the page and its
 * FAQPage schema, so the two can never disagree.
 */
export function faqs(place: Place, context: PlaceContext): Faq[] {
  const out: Faq[] = []
  const hours = readHours(place)
  const parking = readParking(place)
  const label = typeName(place.placeType)
  const street = streetLine(place)
  const at = street ? `, at ${street}` : ''

  out.push({
    question: `What is ${place.name}?`,
    answer: place.description
      ? `${place.description} It is a ${label} in ${where(place)}${at}.`
      : `${place.name} is a ${label} in ${where(place)}${at}.`,
  })

  out.push({
    question: `What are the opening hours at ${place.name}?`,
    answer: !hours
      ? `No opening hours are published for ${place.name}. Public spaces like this are commonly open from dawn to dusk, but confirm with ${
          place.phone ? `the listed number, ${place.phone},` : 'the operator'
        } before travelling.`
      : hours.allDay
        ? `${place.name} is open 24 hours a day, seven days a week.`
        : hours.uniform && hours.openEveryDay
          ? `${place.name} is open ${hours.uniform} every day of the week.`
          : `Hours vary by day: ${place.hours.join('; ')}.`,
  })

  if (place.allowsDogs !== null) {
    out.push({
      question: `Are dogs allowed at ${place.name}?`,
      answer: place.allowsDogs
        ? `Yes — ${place.name} is listed as dog-friendly. Leash rules still vary from area to area, so watch for posted signs.`
        : `No. ${place.name} is not listed as allowing dogs.`,
    })
  }

  if (place.hasRestroom !== null) {
    out.push({
      question: `Are there restrooms at ${place.name}?`,
      answer: place.hasRestroom
        ? `Yes, restrooms are available at ${place.name}.`
        : `No restrooms are listed for ${place.name}, so plan accordingly.`,
    })
  }

  out.push({
    question: `Is there parking at ${place.name}?`,
    answer: parking
      ? `Parking options here include ${list(parking.labels)}.`
      : `No parking is recorded for ${place.name}. Expect to look for street parking nearby.`,
  })

  if (place.goodForChildren !== null) {
    out.push({
      question: `Is ${place.name} good for kids?`,
      answer: place.goodForChildren
        ? `Yes — ${place.name} is flagged as family-friendly.`
        : `${place.name} is not listed as being geared toward children.`,
    })
  }

  if (place.rating !== null && place.reviewCount > 0) {
    out.push({
      question: `How is ${place.name} rated?`,
      answer: `${place.name} holds ${place.rating} out of 5 stars from ${place.reviewCount.toLocaleString()} Google reviews.`,
    })
  }

  if (context.peers.length > 0) {
    out.push({
      question: `What else is nearby?`,
      answer: `${place.city} has ${context.peers.length} other ${
        context.peers.length === 1
          ? typeName(place.placeType)
          : typeNamePlural(place.placeType)
      } listed on AllParx, including ${list(context.peers.slice(0, 3).map((p) => p.name))}.`,
    })
  }

  return out
}
