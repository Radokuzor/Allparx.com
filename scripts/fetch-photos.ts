/**
 * Wikimedia Commons photos. Run by hand — never part of a build.
 *
 *   npm run photos:places -- --dry-run    # report matches, write nothing
 *   npm run photos:places -- --limit=50
 *   npm run photos:places -- --force      # recheck places already checked
 *   npm run photos:search -- --dry-run    # Commons search by name, for places geosearch missed
 *   npm run photos:flickr -- --dry-run    # Flickr CC fallback for places Commons missed
 *   npm run photos:categories             # rewrite src/data/category-photos.json
 *   npm run photos:categories -- --only=park,beach   # refresh just these
 *
 * Changes reach the live site on the next deploy, when the build snapshot
 * picks up the new `photo` fields.
 */
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Photo } from '../src/lib/photos'

dotenv.config({ path: '.env.local' })

const USER_AGENT = 'AllParxPhotoBot/1.0 (https://allparx.com)'
const CATEGORY_FILE = 'src/data/category-photos.json'
const SEARCH_RADIUS_M = 1000
const MIN_WIDTH = 1000
const CATEGORY_CANDIDATES = Number(process.argv.find((a) => a.startsWith('--per='))?.split('=')[1] ?? 12)

// Direct members of these Commons categories were checked by eye to be on
// topic. Deep (recursive) category search drifts badly, so don't switch to it.
const CATEGORY_SOURCES: Record<string, string[]> = {
  park: ['Parks in Minneapolis', 'Parks in Portland, Oregon', 'Parks in Chicago'],
  dog_park: ['Dog parks in the United States', 'Dog parks'],
  campground: ['Campgrounds in the United States', 'Campsites'],
  hiking_area: ['Hiking in the United States', 'Hiking trails'],
  beach: ['Beaches of Florida'],
  rv_park: ['RV parks in the United States', 'RV parks'],
  national_park: ['Landscapes of Yellowstone National Park', 'Zion National Park', 'Yosemite Valley'],
  state_park: ['Starved Rock State Park', 'State parks of California'],
  wildlife_refuge: ['Wetlands of the United States', 'Nature reserves in the United States'],
  sports_complex: ['Sports complexes in the United States', 'Sports complexes', 'Baseball fields'],
  community_center: [
    'Basketball courts in the United States',
    'Tennis courts in the United States',
    'Community centers in the United States',
  ],
  picnic_ground: ['Picnic shelters', 'Picnic tables'],
  fishing_pond: [
    'Fishing piers in the United States',
    'Ponds in the United States',
    'Ponds in Illinois',
    'Ponds in Minnesota',
  ],
  garden: ['Botanical gardens in the United States', 'Flower gardens'],
  marina: ['Marinas in the United States', 'Marinas in California'],
  playground: ['Playgrounds in the United States', 'Playgrounds', 'Playground equipment'],
  swimming_pool: ['Outdoor swimming pools in the United States', 'Swimming pools in California'],
  skateboard_park: ['Skateparks in the United States'],
  lake: ['Lakes of Minnesota', 'Lakes of Colorado', 'Lakes of Texas', 'Lakes of Washington (state)'],
}

// Connectors and generic-institution words: never distinctive, and too weak to
// anchor a match even paired with one distinctive word ("the House at Y" is not
// evidence a photo is of a place merely because both contain "house" and "Y").
const STOP_WORDS = new Set(
  'the of and at in on a an public city county memorial house home building hall club'.split(' '),
)

// Words that name a kind of place rather than which one. Excluded from being
// "distinctive" on their own, but — unlike STOP_WORDS — still count as the
// second anchor when only one distinctive word matched, since a title sharing
// the place's own category word ("Park", "Beach") is real corroborating signal.
const KIND_WORDS = new Set(
  (
    'park parks beach trail trails trailhead area dog dogs center centre recreation ' +
    'community pool pools aquatic aquatics swimming garden gardens playground field fields ' +
    'picnic grove state national wildlife refuge preserve nature campground campgrounds camp ' +
    'rv marina harbor skate skatepark sports complex pond lake fishing'
  ).split(' '),
)

const GENERIC_WORDS = new Set([...STOP_WORDS, ...KIND_WORDS])

// Kind words that narrow a place to one specific facility inside a larger
// one. When the name has one, the photo title must too: otherwise "Woodlawn
// Lake Dog Park" takes a photo of the lake's lighthouse and "Lake Austin
// Marina" a photo of a water plant on Lake Austin. Broad words like "park"
// and "lake" are left out — they describe the whole site, not a part of it.
const FACILITY_WORDS = new Set(
  (
    'dog skate skatepark marina harbor garden center centre pool aquatic aquatics ' +
    'playground field fields sports complex trail trailhead campground recreation picnic'
  ).split(' '),
)

// Matches that pass the title rules but show the wrong thing, found by eye
// in the 2026-09-30 dry run. A listed name is recorded as checked with no photo.
const REJECTED: Set<string> = new Set(
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'scripts/photo-rejects.json'), 'utf8')) as string[],
)

const ALLOWED_LICENSE = /^(cc0|public domain|pd[\s-]|cc[\s-]by(-sa)?[\s-]\d)/i

const args = process.argv.slice(2)
const mode = args[0]
const option = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const limit = Number(option('limit') ?? Infinity)
const only = option('only')?.split(',').map((type) => type.trim()).filter(Boolean)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// --- Commons API -----------------------------------------------------------

type ImageInfo = {
  url: string
  width: number
  height: number
  mime: string
  descriptionurl: string
  thumburl?: string
  thumbwidth?: number
  thumbheight?: number
  extmetadata?: Record<string, { value?: string } | undefined>
}

type CommonsPage = { title: string; index?: number; imageinfo?: ImageInfo[] }

type CommonsResponse = {
  query?: { pages?: CommonsPage[]; geosearch?: { title: string; dist: number }[] }
  error?: { code: string; info: string }
}

const IMAGE_INFO = {
  prop: 'imageinfo',
  iiprop: 'url|size|mime|extmetadata',
  iiurlwidth: '1280',
  iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|Restrictions',
}

async function commons(params: Record<string, string>): Promise<CommonsResponse> {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })
  const url = `https://commons.wikimedia.org/w/api.php?${query}`

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    const wait = Number(response.headers.get('retry-after')) || 2 ** attempt
    if (response.ok) {
      const body = (await response.json()) as CommonsResponse
      if (body.error?.code === 'maxlag' && attempt < 5) {
        await sleep(wait * 1000)
        continue
      }
      if (body.error) throw new Error(`Commons API: ${body.error.info}`)
      return body
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      await sleep(wait * 1000)
      continue
    }
    throw new Error(`Commons API: HTTP ${response.status}`)
  }
}

/** Commons metadata values are HTML fragments. */
function plainText(html: string | undefined): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function toPhoto(page: CommonsPage): Photo | null {
  const info = page.imageinfo?.[0]
  if (!info || !/^image\/(jpeg|png)$/.test(info.mime)) return null
  // Landscape only: every slot on the site is wider than it is tall.
  if (info.width < MIN_WIDTH || info.width < info.height * 1.2) return null

  const meta = info.extmetadata ?? {}
  const license = plainText(meta.LicenseShortName?.value)
  if (!ALLOWED_LICENSE.test(license)) return null
  // Trademark, personality-rights and similar restrictions need case-by-case review.
  if (plainText(meta.Restrictions?.value)) return null

  return {
    url: info.thumburl ?? info.url,
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    title: page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
    author:
      (plainText(meta.Artist?.value) || plainText(meta.Credit?.value) || 'Unknown author').slice(0, 80),
    license,
    licenseUrl: meta.LicenseUrl?.value || null,
    sourceUrl: info.descriptionurl,
  }
}

// --- Flickr (fallback) -----------------------------------------------------

// Flickr licence ids that permit reuse with attribution: CC BY 2.0, CC BY-SA
// 2.0, CC0, Public Domain Mark, CC BY 4.0, CC BY-SA 4.0. NC and ND licences are
// excluded — the site carries ads, and every slot crops the image.
const FLICKR_LICENSES: Record<string, { name: string; url: string | null }> = {
  '4': { name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/' },
  '5': { name: 'CC BY-SA 2.0', url: 'https://creativecommons.org/licenses/by-sa/2.0/' },
  '9': { name: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  '10': { name: 'Public domain', url: 'https://creativecommons.org/publicdomain/mark/1.0/' },
  '11': { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  '12': { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
}

type FlickrPhoto = {
  id: string
  owner: string
  title: string
  license: string
  ownername?: string
  url_l?: string
  width_l?: number | string
  height_l?: number | string
}

type FlickrResponse = { stat: string; message?: string; photos?: { photo: FlickrPhoto[] } }

async function flickr(params: Record<string, string>): Promise<FlickrResponse> {
  const key = process.env.FLICKR_API_KEY
  if (!key) throw new Error('FLICKR_API_KEY is not set in .env.local')
  const query = new URLSearchParams({ api_key: key, format: 'json', nojsoncallback: '1', ...params })

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(`https://api.flickr.com/services/rest/?${query}`, {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (response.ok) {
      const body = (await response.json()) as FlickrResponse
      if (body.stat !== 'ok') throw new Error(`Flickr API: ${body.message ?? body.stat}`)
      return body
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      await sleep(2 ** attempt * 1000)
      continue
    }
    throw new Error(`Flickr API: HTTP ${response.status}`)
  }
}

async function findFlickrPhoto(name: string, lat: number, lng: number): Promise<Photo | null> {
  const result = await flickr({
    method: 'flickr.photos.search',
    text: name,
    lat: String(lat),
    lon: String(lng),
    radius: String(SEARCH_RADIUS_M / 1000),
    radius_units: 'km',
    license: Object.keys(FLICKR_LICENSES).join(','),
    content_type: '1',
    media: 'photos',
    safe_search: '1',
    sort: 'relevance',
    extras: 'license,owner_name,url_l',
    per_page: '50',
  })
  for (const hit of result.photos?.photo ?? []) {
    // Same corroboration rule as Commons: the photo's own title has to name
    // the place. Flickr's text search also matches tags and descriptions,
    // which is far too loose on its own.
    if (!titleNamesPlace(hit.title, name)) continue
    const license = FLICKR_LICENSES[hit.license]
    const width = Number(hit.width_l)
    const height = Number(hit.height_l)
    if (!license || !hit.url_l || width < MIN_WIDTH || width < height * 1.2) continue
    return {
      url: hit.url_l,
      width,
      height,
      title: hit.title,
      author: (hit.ownername || 'Unknown author').slice(0, 80),
      license: license.name,
      licenseUrl: license.url,
      sourceUrl: `https://www.flickr.com/photos/${hit.owner}/${hit.id}`,
    }
  }
  return null
}

// --- Places ----------------------------------------------------------------

function words(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function titleNamesPlace(fileTitle: string, placeName: string): boolean {
  const title = ` ${words(fileTitle.replace(/^File:/, ''))} `
  const name = words(placeName)
  // A whole-name hit counts only when the name has two real words; "austin s" is not a name.
  const realWords = name.split(' ').filter((w) => w.length >= 3)
  if (name.length >= 8 && realWords.length >= 2 && title.includes(` ${name} `)) return true

  const nameWords = name.split(' ')
  const distinctive = nameWords.filter((w) => !GENERIC_WORDS.has(w) && (w.length >= 3 || /\d/.test(w)))
  if (distinctive.length === 0) return false
  if (!distinctive.every((w) => title.includes(` ${w} `))) return false
  const singular = (w: string) => w.replace(/s$/, '')
  const facilities = nameWords.filter((w) => FACILITY_WORDS.has(w) || FACILITY_WORDS.has(singular(w)))
  if (!facilities.every((w) => title.includes(` ${w} `) || title.includes(` ${singular(w)} `) || title.includes(` ${singular(w)}s `))) {
    return false
  }
  // One distinctive word alone ("Lincoln") is too common; require a second
  // anchor, either another distinctive word or the place's own kind word.
  return (
    distinctive.length >= 2 ||
    nameWords.some((w) => KIND_WORDS.has(w) && title.includes(` ${w} `))
  )
}

async function findPlacePhoto(name: string, lat: number, lng: number): Promise<Photo | null> {
  const nearby = await commons({
    action: 'query',
    list: 'geosearch',
    gscoord: `${lat}|${lng}`,
    gsradius: String(SEARCH_RADIUS_M),
    gsnamespace: '6',
    gslimit: '100',
  })
  const hits = (nearby.query?.geosearch ?? []).filter((hit) => titleNamesPlace(hit.title, name))
  if (hits.length === 0) return null

  const distance = new Map(hits.map((hit) => [hit.title, hit.dist]))
  const details = await commons({
    action: 'query',
    titles: hits.slice(0, 20).map((hit) => hit.title).join('|'),
    ...IMAGE_INFO,
  })
  const closest = (details.query?.pages ?? [])
    .map((page) => ({ photo: toPhoto(page), dist: distance.get(page.title) ?? SEARCH_RADIUS_M }))
    .filter((entry): entry is { photo: Photo; dist: number } => entry.photo !== null)
    .sort((a, b) => a.dist - b.dist)[0]
  return closest?.photo ?? null
}

// --- Commons search (by name) ---------------------------------------------

/** How far a search hit's camera location may be from the place. */
const SEARCH_MAX_KM = 25

function kmBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}

type SearchPage = CommonsPage & { coordinates?: { lat: number; lon: number }[] }

/**
 * Geosearch only sees files that carry a location near the place. Plenty of
 * good photos have no location, or one just outside the radius, so this
 * searches file titles for the name instead. A title match alone is weak —
 * there are dozens of Lincoln Parks — so a hit must also be placed near the
 * place by its coordinates, or, lacking any, name the city in its title.
 */
async function findCommonsByName(name: string, lat: number, lng: number, city: string): Promise<Photo | null> {
  const result = await commons({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap intitle:"${name.replace(/"/g, '')}"`,
    gsrnamespace: '6',
    gsrlimit: '20',
    ...IMAGE_INFO,
    prop: `${IMAGE_INFO.prop}|coordinates`,
  })
  const citySlug = ` ${words(city)} `
  const pages = ((result.query?.pages ?? []) as SearchPage[]).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  for (const page of pages) {
    if (!titleNamesPlace(page.title, name)) continue
    const at = page.coordinates?.[0]
    const near = at
      ? kmBetween(lat, lng, at.lat, at.lon) <= SEARCH_MAX_KM
      : ` ${words(page.title.replace(/^File:/, ''))} `.includes(citySlug)
    if (!near) continue
    const photo = toPhoto(page)
    if (photo) return photo
  }
  return null
}

type Source = 'commons' | 'search' | 'flickr'

async function places(source: Source) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  const db = admin.firestore()

  const snapshot = await db.collection('places').get()
  // Search and Flickr only fill gaps geosearch left, and each keeps its own
  // checked stamp so no run skips another's work.
  const checkedField = { commons: 'photoCheckedAt', search: 'searchCheckedAt', flickr: 'flickrCheckedAt' }[source]
  const gapFill = source !== 'commons'
  const todo = snapshot.docs
    .filter((doc) => !gapFill || (doc.get('photoCheckedAt') !== undefined && !doc.get('photo')))
    .filter((doc) => force || doc.get(checkedField) === undefined)
    .slice(0, limit)
  const find = {
    commons: findPlacePhoto,
    search: findCommonsByName,
    flickr: findFlickrPhoto,
  }[source]
  const label = { commons: 'Commons', search: 'Commons search', flickr: 'Flickr' }[source]

  console.log(`📷 Matching ${label} photos for ${todo.length} of ${snapshot.size} places`)
  if (dryRun) console.log('   DRY RUN — nothing will be written to Firestore')

  let found = 0
  let failed = 0
  let batch = db.batch()
  let batched = 0
  const flush = async () => {
    if (batched > 0 && !dryRun) await batch.commit()
    batch = db.batch()
    batched = 0
  }

  for (const [i, doc] of todo.entries()) {
    const { name, lat, lng, city } = doc.data() as { name: string; lat: number | null; lng: number | null; city: string }
    let photo: Photo | null = null
    try {
      if (lat !== null && lng !== null && !REJECTED.has(name)) photo = await find(name, lat, lng, city)
    } catch (error) {
      // Leave it unchecked so the next run retries it.
      failed += 1
      console.error(`   ✖ ${name}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    if (photo) {
      found += 1
      console.log(`   ✓ ${name} → ${photo.title} (${photo.license})`)
    }
    const checkedAt = new Date().toISOString()
    // A gap-fill miss must leave the field alone; only a hit writes `photo`.
    batch.update(
      doc.ref,
      gapFill
        ? { ...(photo ? { photo } : {}), [checkedField]: checkedAt }
        : { photo, [checkedField]: checkedAt },
    )
    batched += 1
    if (batched === 400) await flush()
    if ((i + 1) % 100 === 0) console.log(`   … ${i + 1}/${todo.length} checked, ${found} photos`)
    await sleep(100)
  }
  await flush()

  console.log('\n✅ Done')
  console.log(`   Photos found:  ${found}/${todo.length}`)
  console.log(`   Errors:        ${failed}${failed ? ' (left unchecked; re-run to retry)' : ''}`)
  if (!dryRun) console.log('   Deploy to publish them.')
}

// --- Categories ------------------------------------------------------------

async function categories() {
  // --out writes candidates somewhere else for review, leaving the curated file alone.
  const file = path.resolve(process.cwd(), option('out') ?? CATEGORY_FILE)
  const unknown = only?.filter((type) => !(type in CATEGORY_SOURCES)) ?? []
  if (unknown.length > 0) throw new Error(`Unknown category: ${unknown.join(', ')}`)

  // --only keeps every other category's hand-curated list untouched.
  const out: Record<string, Photo[]> =
    only && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}

  for (const [type, sources] of Object.entries(CATEGORY_SOURCES)) {
    if (only && !only.includes(type)) continue
    const seen = new Set<string>()
    const perSource: Photo[][] = []
    for (const category of sources) {
      const picked: Photo[] = []
      perSource.push(picked)
      const result = await commons({
        action: 'query',
        generator: 'search',
        gsrsearch: `filetype:bitmap incategory:"${category.replace(/ /g, '_')}"`,
        gsrnamespace: '6',
        gsrlimit: '50',
        ...IMAGE_INFO,
      })
      const ranked = (result.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      for (const page of ranked) {
        if (seen.has(page.title)) continue
        seen.add(page.title)
        const photo = toPhoto(page)
        if (photo) picked.push(photo)
      }
      await sleep(200)
    }
    // Alternate between sources so the first one can't fill every slot.
    const mixed: Photo[] = []
    for (let rank = 0; mixed.length < CATEGORY_CANDIDATES; rank += 1) {
      const row = perSource.map((list) => list[rank]).filter((photo): photo is Photo => !!photo)
      if (row.length === 0) break
      mixed.push(...row)
    }
    out[type] = mixed.slice(0, CATEGORY_CANDIDATES)
    console.log(`   ${type}: ${out[type].length} photos`)
  }

  if (dryRun) return
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`\n✅ Wrote ${path.relative(process.cwd(), file)} — review the diff and delete any photo that doesn't fit.`)
}

// --- Main ------------------------------------------------------------------

const run =
  mode === 'places'
    ? () => places('commons')
    : mode === 'search'
      ? () => places('search')
      : mode === 'flickr'
        ? () => places('flickr')
        : mode === 'categories'
          ? categories
          : null
if (!run) {
  console.error('Usage: tsx scripts/fetch-photos.ts <places|search|flickr|categories> [--dry-run] [--limit=N] [--force]')
  process.exit(1)
}
run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
