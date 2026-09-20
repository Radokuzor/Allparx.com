/**
 * The outdoor categories AllParx covers.
 *
 * Every key is a real Google Places API (New) Table A type — verified against
 * places:searchNearby. Three types from the original spec (`nature_reserve`,
 * `recreation_center`, `fishing_area`) are rejected by the API as
 * "Unsupported types" and have been replaced with their working equivalents:
 * wildlife_refuge, community_center and fishing_pond.
 *
 * Keys appear verbatim in URLs (/places/category/<key>), so don't rename one
 * after its page has been indexed.
 */
export const PLACE_TYPES = [
  'park',
  'dog_park',
  'campground',
  'hiking_area',
  'beach',
  'rv_park',
  'national_park',
  'state_park',
  'wildlife_refuge',
  'sports_complex',
  'community_center',
  'picnic_ground',
  'fishing_pond',
  'garden',
  'marina',
  'playground',
  'swimming_pool',
  'skateboard_park',
] as const

export type PlaceType = (typeof PLACE_TYPES)[number]

/** Categories surfaced in the header nav and homepage chips. */
export const FEATURED_TYPES: string[] = [
  'park',
  'dog_park',
  'hiking_area',
  'beach',
  'campground',
  'playground',
  'garden',
]

/** Singular label — cards, breadcrumbs, detail-page eyebrow. */
export const TYPE_LABEL: Record<string, string> = {
  park: 'Park',
  dog_park: 'Dog Park',
  campground: 'Campground',
  hiking_area: 'Hiking Trail',
  beach: 'Beach',
  rv_park: 'RV Park',
  national_park: 'National Park',
  state_park: 'State Park',
  wildlife_refuge: 'Wildlife Refuge',
  sports_complex: 'Sports Complex',
  community_center: 'Recreation Center',
  picnic_ground: 'Picnic Area',
  fishing_pond: 'Fishing Spot',
  garden: 'Garden',
  marina: 'Marina',
  playground: 'Playground',
  swimming_pool: 'Swimming Pool',
  skateboard_park: 'Skate Park',
}

/** Plural label — category H1s, nav links, list headings. */
export const TYPE_LABEL_PLURAL: Record<string, string> = {
  park: 'Parks',
  dog_park: 'Dog Parks',
  campground: 'Campgrounds',
  hiking_area: 'Hiking Trails',
  beach: 'Beaches',
  rv_park: 'RV Parks',
  national_park: 'National Parks',
  state_park: 'State Parks',
  wildlife_refuge: 'Wildlife Refuges',
  sports_complex: 'Sports Complexes',
  community_center: 'Recreation Centers',
  picnic_ground: 'Picnic Areas',
  fishing_pond: 'Fishing Spots',
  garden: 'Gardens',
  marina: 'Marinas',
  playground: 'Playgrounds',
  swimming_pool: 'Swimming Pools',
  skateboard_park: 'Skate Parks',
}

/**
 * schema.org type per category, so each detail page emits the most specific
 * entity Google understands rather than a blanket `Park`.
 */
export const SCHEMA_TYPE: Record<string, string> = {
  park: 'Park',
  dog_park: 'Park',
  campground: 'Campground',
  hiking_area: 'Park',
  beach: 'Beach',
  rv_park: 'RVPark',
  national_park: 'Park',
  state_park: 'Park',
  wildlife_refuge: 'Park',
  sports_complex: 'SportsActivityLocation',
  community_center: 'SportsActivityLocation',
  picnic_ground: 'Park',
  fishing_pond: 'TouristAttraction',
  garden: 'TouristAttraction',
  marina: 'TouristAttraction',
  playground: 'Playground',
  swimming_pool: 'PublicSwimmingPool',
  skateboard_park: 'SportsActivityLocation',
  // Off-category types that legacy restores can carry through.
  tourist_attraction: 'TouristAttraction',
  historical_landmark: 'LandmarksOrHistoricalBuildings',
  hiking_trail: 'Park',
}

/**
 * Legacy restores keep Google's own primary type when it isn't one of ours
 * (see scripts/restore-legacy.ts), so labels have to cope with types that were
 * never in the tables above — `tourist_attraction`, `historical_landmark`.
 * Title-casing them keeps headings and eyebrows reading as labels rather than
 * as raw API values.
 */
function titleCase(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? titleCase(type)
}

export function typeLabelPlural(type: string): string {
  return TYPE_LABEL_PLURAL[type] ?? `${titleCase(type)}s`
}

export function isKnownType(type: string): boolean {
  return (PLACE_TYPES as readonly string[]).includes(type)
}
