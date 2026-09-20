/**
 * Legacy URL recovery — rebuilds place pages for URLs the previous
 * allparx.com had indexed, so Google's existing rankings resolve again.
 *
 * Background: the old site was a WordPress directory whose place URLs were
 * /places/<name>/ with no city segment. The current ingest writes
 * /places/<name>-<city>, so none of the old URLs resolve — and the analytics
 * data shows essentially all organic search traffic landing on those 404s.
 *
 * This script takes the dead slugs the site is actually being asked for,
 * resolves each one by name through Places Text Search, and writes it back
 * under its original slug. Unlike `ingest-places.ts` it searches by text
 * rather than by city radius, so places outside the top-50 metros resolve too.
 *
 * A wrong address on a page that ranks is worse than a 404, so a result is
 * only written when the name Google returns matches the slug that was asked
 * for. Everything else is reported as unresolved and left alone.
 *
 *   npm run restore -- --dry-run            # resolve, write nothing
 *   npm run restore -- --limit=25           # the 25 highest-value slugs
 *   npm run restore -- --organic-only       # only slugs Google sent users to
 *   npm run restore -- --limit=0            # everything (see the cost line)
 *   npm run restore -- --slug=banyan-tree   # a named URL, demand or not
 */
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import {
  apiCallCount,
  bestMatch,
  isAmbiguous,
  searchByText,
  sleep,
  stripDedupeSuffix,
  toDocument,
} from './lib/resolve-place'

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

// --- Args ------------------------------------------------------------------

const args = process.argv.slice(2)
const flag = (name: string) => args.some((a) => a === `--${name}`)
const value = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

const dryRun = flag('dry-run')
const organicOnly = flag('organic-only')
/**
 * A -2/-33 suffix means WordPress was disambiguating N places that shared a
 * name, so the slug alone cannot say *which* Lincoln Park it was. Text Search
 * will still answer confidently — with the most famous one — which is how you
 * end up publishing Chicago's Lincoln Park at a slug that meant a municipal
 * park in Ohio. These are skipped unless explicitly asked for.
 */
const includeAmbiguous = flag('include-ambiguous')
/** 0 means no limit. Defaults to 25 so an unqualified run cannot spend much. */
const limit = Number(value('limit') ?? 25)
const minHits = Number(value('min-hits') ?? 1)
/**
 * Slugs to restore regardless of demand: `--slug=banyan-tree,hole-in-the-wall`.
 *
 * The analytics queue can only see a URL *after* traffic has already landed on
 * its 404, which means the highest-value pages are found last — a URL that
 * still ranks but happens not to have been clicked this week is invisible to
 * it. Indexed URLs are knowable up front from a Semrush "Indexed Pages" export,
 * Search Console, or the Wayback CDX index, so this flag restores them before
 * they decay out of the index rather than after.
 *
 * Explicit slugs bypass the ambiguity guard and the demand thresholds: naming
 * one is itself the evidence that it is wanted.
 */
const explicitSlugs = (value('slug') ?? '')
  .split(',')
  .map((s) => s.trim().replace(/^\/?places\//, '').replace(/\/$/, ''))
  .filter(Boolean)
/**
 * Overrides the search text for a single `--slug=` run, e.g.
 * `--slug=banyan-tree --query="Banyan Tree Haleiwa HI"`.
 *
 * A slug is only the old page title, which for a landmark is often too generic
 * to search on: "banyan tree" returns a Florida housing development long before
 * the Oahu tree. Adding the locality finds the right place without weakening
 * anything — the name guard still has to accept whatever comes back.
 */
const queryOverride = value('query')

// --- Slug helpers ----------------------------------------------------------

function searchQuery(slug: string): string {
  if (queryOverride && explicitSlugs.length === 1) return queryOverride
  return stripDedupeSuffix(slug).replace(/-/g, ' ')
}

// --- Demand ----------------------------------------------------------------

type Demand = { slug: string; hits: number; organic: number }

/** Count of slugs held back by the ambiguity guard, for the summary line. */
let ambiguousSkipped = 0

/**
 * The work queue is the site's own 404 log: every /places/<slug> the analytics
 * collection has seen that has no document behind it, ranked by how much real
 * search traffic it wasted.
 */
async function deadSlugsByDemand(): Promise<Demand[]> {
  const [placeSnap, visitSnap] = await Promise.all([
    db.collection('places').select('slug').get(),
    db.collection('analytics_visits').select('path', 'referrerHost', 'bot').get(),
  ])

  const live = new Set(placeSnap.docs.map((doc) => doc.id))
  const demand = new Map<string, Demand>()

  for (const doc of visitSnap.docs) {
    const visit = doc.data() as { path?: string; referrerHost?: string | null; bot?: boolean }
    const match = /^\/places\/([^/]+)\/?$/.exec(visit.path ?? '')
    if (!match) continue

    const slug = match[1]
    if (slug === 'category' || live.has(slug)) continue

    const entry = demand.get(slug) ?? { slug, hits: 0, organic: 0 }
    if (!visit.bot) entry.hits++
    if (visit.referrerHost === 'google.com') entry.organic++
    demand.set(slug, entry)
  }

  const wanted = [...demand.values()].filter(
    (d) => d.hits >= minHits && (!organicOnly || d.organic > 0),
  )
  const unambiguous = wanted.filter((d) => includeAmbiguous || !isAmbiguous(d.slug))
  ambiguousSkipped = wanted.length - unambiguous.length

  return unambiguous.sort((a, b) => b.organic - a.organic || b.hits - a.hits)
}

/**
 * The named-slug queue. Only the `places` collection is read — the analytics
 * scan is skipped entirely, since demand is not what selected these.
 */
async function namedSlugs(slugs: string[]): Promise<Demand[]> {
  const placeSnap = await db.collection('places').select('slug').get()
  const live = new Set(placeSnap.docs.map((doc) => doc.id))

  for (const slug of slugs.filter((s) => live.has(s))) {
    console.log(`   ⚠ ${slug} already has a document — it will be overwritten`)
  }

  return slugs.map((slug) => ({ slug, hits: 0, organic: 0 }))
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log('🔁 AllParx legacy URL recovery\n')

  const named = explicitSlugs.length > 0
  const queue = named ? await namedSlugs(explicitSlugs) : await deadSlugsByDemand()
  // Naming slugs is the cost decision; the demand queue's spend guard does not
  // apply to them.
  const batchQueue = named || limit <= 0 ? queue : queue.slice(0, limit)

  if (named) {
    console.log(`   Named slugs            : ${queue.length} (demand queue skipped)`)
  } else {
    console.log(`   Dead slugs with demand : ${queue.length}`)
  }
  if (ambiguousSkipped > 0) {
    console.log(`   Held back as ambiguous : ${ambiguousSkipped} (name+number slugs — --include-ambiguous to force)`)
  }
  console.log(`   Attempting this run    : ${batchQueue.length}`)
  console.log(`   Max Places API calls   : ${batchQueue.length}`)
  if (dryRun) console.log('   DRY RUN — nothing will be written to Firestore')
  console.log('')

  let restored = 0
  let rejected = 0
  let notFound = 0
  const rejects: string[] = []

  for (const [i, entry] of batchQueue.entries()) {
    const position = `[${i + 1}/${batchQueue.length}]`
    const query = searchQuery(entry.slug)
    const results = await searchByText(query, API_KEY as string)

    if (results.length === 0) {
      notFound++
      console.log(`${position} ✖ ${entry.slug} — no Places result for "${query}"`)
      await sleep(200)
      continue
    }

    const best = bestMatch(entry.slug, results)

    if (!best) {
      rejected++
      rejects.push(`${entry.slug} → got "${results[0].displayName?.text ?? '?'}"`)
      console.log(`${position} ⚠ ${entry.slug} — no confident match, skipped`)
      await sleep(200)
      continue
    }

    const doc = toDocument(best.place, entry.slug, { legacy: true })
    if (!dryRun) {
      await db.collection('places').doc(entry.slug).set(doc)
    }
    restored++
    console.log(
      `${position} ✓ ${entry.slug} → ${doc.name}, ${doc.city} ${doc.state ?? ''} ` +
        `(${best.score}, ${doc.placeType}${doc.onBrand ? '' : ', off-category'}, ${entry.organic} organic hits)`,
    )
    await sleep(200)
  }

  console.log('\n─────────────────────────────')
  console.log(`   Restored     : ${restored}`)
  console.log(`   No match     : ${rejected}`)
  console.log(`   No result    : ${notFound}`)
  console.log(`   API calls    : ${apiCallCount()}`)
  console.log(`   Remaining    : ${Math.max(0, queue.length - batchQueue.length)}`)

  if (rejects.length > 0) {
    console.log('\n   Rejected (name did not match the slug):')
    for (const line of rejects.slice(0, 20)) console.log(`     · ${line}`)
  }

  if (dryRun) console.log('\n   Dry run — re-run without --dry-run to write these.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
