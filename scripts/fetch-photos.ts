/**
 * Wikimedia Commons photos. Run by hand — never part of a build.
 *
 *   npm run photos:places -- --dry-run    # report matches, write nothing
 *   npm run photos:places -- --limit=50
 *   npm run photos:places -- --force      # recheck places already checked
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
const CATEGORY_CANDIDATES = 12

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
  if (name.length >= 8 && name.includes(' ') && title.includes(` ${name} `)) return true

  const nameWords = name.split(' ')
  const distinctive = nameWords.filter((w) => !GENERIC_WORDS.has(w) && (w.length >= 3 || /\d/.test(w)))
  if (distinctive.length === 0) return false
  if (!distinctive.every((w) => title.includes(` ${w} `))) return false
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

async function places() {
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
  const todo = snapshot.docs
    .filter((doc) => force || doc.get('photoCheckedAt') === undefined)
    .slice(0, limit)

  console.log(`📷 Matching Commons photos for ${todo.length} of ${snapshot.size} places`)
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
    const { name, lat, lng } = doc.data() as { name: string; lat: number | null; lng: number | null }
    let photo: Photo | null = null
    try {
      if (lat !== null && lng !== null) photo = await findPlacePhoto(name, lat, lng)
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
    batch.update(doc.ref, { photo, photoCheckedAt: new Date().toISOString() })
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
  const file = path.resolve(process.cwd(), CATEGORY_FILE)
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
  console.log(`\n✅ Wrote ${CATEGORY_FILE} — review the diff and delete any photo that doesn't fit.`)
}

// --- Main ------------------------------------------------------------------

const run = mode === 'places' ? places : mode === 'categories' ? categories : null
if (!run) {
  console.error('Usage: tsx scripts/fetch-photos.ts <places|categories> [--dry-run] [--limit=N] [--force]')
  process.exit(1)
}
run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
