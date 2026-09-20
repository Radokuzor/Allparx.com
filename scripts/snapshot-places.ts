/**
 * Exports the `places` collection to a local JSON snapshot that the Next.js
 * build reads instead of querying Firestore per page.
 *
 * A static build renders one page per place plus category, city and sitemap
 * routes. Answering each of those from Firestore costs tens of thousands of
 * document reads — enough to exhaust the daily quota in a single build. One
 * full scan here costs exactly one read per document, and every page is then
 * served from memory.
 *
 * Runs automatically via the `prebuild` npm script. Safe to skip: if the
 * snapshot is absent the data layer falls back to live Firestore queries.
 */
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { NEAR_INDEX_FILE, SEARCH_INDEX_FILE, SNAPSHOT_PATH } from '../src/lib/snapshot-path'
import { packFlags, type NearEntry } from '../src/lib/near-index-format'
import { isKnownType } from '../src/lib/place-types'

dotenv.config({ path: '.env.local' })

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

async function main() {
  const started = Date.now()

  if (process.env.SKIP_SNAPSHOT === '1') {
    console.log('📦 SKIP_SNAPSHOT=1 — build will query Firestore directly.')
    process.exit(0)
  }

  console.log('📦 Snapshotting Firestore "places" collection...')

  const snapshot = await admin.firestore().collection('places').get()

  // Firestore Timestamps don't survive JSON, and no page renders them.
  const places = snapshot.docs.map((doc) => {
    const { createdAt, updatedAt, ...rest } = doc.data()
    void createdAt
    void updatedAt
    return rest
  })

  const out = path.resolve(process.cwd(), SNAPSHOT_PATH)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), places }))

  // Compact index for client-side search, served straight from the CDN so a
  // search costs no Firestore reads. Keys are short because this ships to every
  // visitor who opens /search.
  const index = places.map((p) => ({
    s: p.slug,
    n: p.name,
    c: p.city,
    t: p.placeType,
    a: p.state ?? '',
    r: p.rating ?? null,
  }))
  const indexOut = path.resolve(process.cwd(), 'public', SEARCH_INDEX_FILE)
  fs.mkdirSync(path.dirname(indexOut), { recursive: true })
  fs.writeFileSync(indexOut, JSON.stringify(index))

  // Index for /near-me: adds coordinates, review counts and amenity flags, and
  // drops anything outside the 18 categories. Legacy restores carry through odd
  // Google types ("premise", "association_or_organization") that belong in
  // search but would read as junk in a "best places near you" list.
  const near: NearEntry[] = places
    .filter((p) => isKnownType(p.placeType) && typeof p.lat === 'number' && typeof p.lng === 'number')
    .map((p) => ({
      s: p.slug,
      n: p.name,
      c: p.city,
      a: p.state ?? '',
      t: p.placeType,
      r: p.rating ?? null,
      v: p.reviewCount ?? 0,
      // Four decimals is ~11 m; the extra digits only cost bytes.
      y: Math.round(p.lat * 1e4) / 1e4,
      x: Math.round(p.lng * 1e4) / 1e4,
      f: packFlags({
        parking: p.parking ?? null,
        allowsDogs: p.allowsDogs ?? null,
        goodForChildren: p.goodForChildren ?? null,
        hasRestroom: p.hasRestroom ?? null,
      }),
    }))
  fs.writeFileSync(path.resolve(process.cwd(), 'public', NEAR_INDEX_FILE), JSON.stringify(near))

  const bytes = fs.statSync(out).size
  console.log(
    `   ${places.length} places · ${(bytes / 1024 / 1024).toFixed(1)} MB · ` +
      `${places.length} document reads · ${((Date.now() - started) / 1000).toFixed(1)}s`,
  )
  console.log(`   → ${SNAPSHOT_PATH}`)
  process.exit(0)
}

main().catch((error: unknown) => {
  const code =
    typeof error === 'object' && error !== null ? (error as { code?: number }).code : undefined
  const message = error instanceof Error ? error.message : String(error)

  // NOT_FOUND means the project genuinely has no database or collection yet.
  // An empty site is the correct output for that, so let the build continue.
  if (code === 5) {
    console.warn('⚠ No Firestore database or collection yet — building an empty site.')
    process.exit(0)
  }

  // Anything else means the data exists but we cannot read it. Failing here
  // keeps a broken build from replacing a good deployment with an empty site.
  console.error('')
  console.error('✖ Firestore snapshot failed — refusing to build an empty site.')
  console.error(`  ${code === 8 ? 'RESOURCE_EXHAUSTED: daily read quota is gone.' : ''}`)
  console.error(`  ${code === 7 ? 'PERMISSION_DENIED: check the service account credentials.' : ''}`)
  console.error(`  code ${code ?? '?'}: ${message}`)
  console.error('')
  console.error('  The quota resets at midnight US/Pacific. One snapshot costs one read')
  console.error('  per place, so a normal build is well inside the free tier.')
  console.error('  To build anyway (and ship an empty site), set SKIP_SNAPSHOT=1.')
  console.error('')
  process.exit(1)
})
