/**
 * Landmark ingestion — the destinations a metro sweep cannot reach.
 *
 * `ingest-places.ts` answers "what outdoor places are near this city centre?".
 * That is the wrong question for anywhere people travel to by name, which is
 * most of what earns links and search traffic. This script asks the other
 * question: given a landmark's name, where is it?
 *
 * Every entry in src/data/landmarks.ts costs one Text Search call. Results are
 * only written when Google's answer carries the name we asked for, so a bad
 * guess in the list is rejected rather than published (see scripts/lib).
 *
 *   npm run ingest:landmarks -- --dry-run      # resolve, write nothing
 *   npm run ingest:landmarks -- --limit=10     # first 10 only
 *   npm run ingest:landmarks -- --overwrite    # refresh existing documents
 *   npm run ingest:landmarks                   # everything missing
 */
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import { LANDMARKS } from '../src/data/landmarks'
import { apiCallCount, bestMatch, legacySlug, searchByText, sleep, toDocument } from './lib/resolve-place'

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

const db = admin.firestore()
const API_KEY = process.env.GOOGLE_PLACES_API_KEY

if (!API_KEY) {
  console.error('✖ GOOGLE_PLACES_API_KEY is missing from .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const flag = (name: string) => args.some((a) => a === `--${name}`)
const value = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

const dryRun = flag('dry-run')
/**
 * Off by default: a landmark already in the collection may have been resolved
 * from a legacy URL and given hand-written content, and rewriting the document
 * would drop the flags that mark it as such.
 */
const overwrite = flag('overwrite')
const limit = Number(value('limit') ?? 0)

async function main() {
  console.log('🗺  AllParx landmark ingestion\n')

  const placeSnap = await db.collection('places').select('slug').get()
  const live = new Set(placeSnap.docs.map((doc) => doc.id))

  const queue = LANDMARKS.map((landmark) => ({ ...landmark, slug: legacySlug(landmark.name) })).filter(
    (landmark) => overwrite || !live.has(landmark.slug),
  )
  const batch = limit > 0 ? queue.slice(0, limit) : queue

  console.log(`   Landmarks in list      : ${LANDMARKS.length}`)
  console.log(`   Already present        : ${LANDMARKS.length - queue.length}`)
  console.log(`   Attempting this run    : ${batch.length}`)
  console.log(`   Max Places API calls   : ${batch.length}`)
  if (dryRun) console.log('   DRY RUN — nothing will be written to Firestore')
  console.log('')

  let added = 0
  let rejected = 0
  let notFound = 0
  const rejects: string[] = []

  for (const [i, landmark] of batch.entries()) {
    const position = `[${i + 1}/${batch.length}]`
    const results = await searchByText(landmark.query, API_KEY as string)

    if (results.length === 0) {
      notFound++
      console.log(`${position} ✖ ${landmark.slug} — no Places result for "${landmark.query}"`)
      await sleep(200)
      continue
    }

    const best = bestMatch(landmark.slug, results)

    if (!best) {
      rejected++
      rejects.push(`${landmark.name} → got "${results[0].displayName?.text ?? '?'}"`)
      console.log(`${position} ⚠ ${landmark.slug} — no confident match, skipped`)
      await sleep(200)
      continue
    }

    const doc = toDocument(best.place, landmark.slug, { landmark: true })
    if (!dryRun) {
      await db.collection('places').doc(landmark.slug).set(doc)
    }
    added++
    console.log(
      `${position} ✓ ${landmark.slug} → ${doc.name}, ${doc.city} ${doc.state ?? ''} ` +
        `(${best.score}, ${doc.placeType}${doc.onBrand ? '' : ', off-category'})`,
    )
    await sleep(200)
  }

  console.log('\n─────────────────────────────')
  console.log(`   Added        : ${added}`)
  console.log(`   No match     : ${rejected}`)
  console.log(`   No result    : ${notFound}`)
  console.log(`   API calls    : ${apiCallCount()}`)

  if (rejects.length > 0) {
    console.log('\n   Rejected (name did not match the list entry):')
    for (const line of rejects) console.log(`     · ${line}`)
    console.log('\n   Fix the `name` in src/data/landmarks.ts to match Google, or drop the entry.')
  }

  if (dryRun) console.log('\n   Dry run — re-run without --dry-run to write these.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
