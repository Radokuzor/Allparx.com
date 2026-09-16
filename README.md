# AllParx

An outdoor recreation directory for the United States. Google Places data is
ingested into Firestore, and Next.js renders a static, SEO-optimised page for
every location.

- **Framework** — Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Data** — Google Places API (New) → Firebase Firestore (Admin SDK)
- **Hosting** — Vercel, fronted by Cloudflare

## URL structure

| Route | Purpose |
| --- | --- |
| `/` | Homepage — featured categories and city index |
| `/places/{slug}` | One location. Slug is `{name}-{city}`, lowercased and hyphenated |
| `/places` | Every category |
| `/places/category/{type}` | All locations of one category |
| `/cities` | Every city |
| `/cities/{city-slug}` | All locations in one city, grouped by category |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt` | Crawler entry points |

The `/places/{slug}` format is load-bearing — existing allparx.com backlinks
point at these URLs, so `slugify()` in `scripts/ingest-places.ts` must not change.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
```

`.env.local` needs:

```
GOOGLE_PLACES_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=        # quoted, with literal \n escapes
NEXT_PUBLIC_SITE_URL=https://allparx.com
```

The Firebase values come from the service-account JSON. That file and
`.env.local` are both gitignored — never commit either.

### Firestore

Before the first ingestion, the project needs a Firestore database. Create it
once at
[console.firebase.google.com](https://console.firebase.google.com) →
**Firestore Database** → **Create database** → Native mode, location `nam5`.
The Admin service account can read and write documents but cannot create the
database or its indexes, so this step has to happen in the console or with an
owner-level account.

Then deploy the rules and composite indexes:

```bash
npx firebase-tools deploy --only firestore
```

`firestore.indexes.json` defines the composite indexes the queries need. Two of
them are required by the ordered queries:

| Query | Index |
| --- | --- |
| `getPlacesByType` | `placeType` ASC, `rating` DESC |
| `getPlacesByCity` | `city` ASC, `rating` DESC |

Until they exist, `getPlacesByType` and `getPlacesByCity` fall back to fetching
the whole filtered set and sorting in memory. Pages still render correctly, but
each query reads far more documents than it returns — the build logs a warning
per call. Deploy the indexes to remove it.

## Ingestion

```bash
npm run ingest:test              # first 5 cities — start here
npm run ingest -- --dry-run      # calls the Places API, writes nothing
npm run ingest -- --cities=10
npm run ingest -- --types=park,dog_park
npm run ingest                   # all 50 cities, all 18 categories
```

The script is idempotent: a slug that already exists is left untouched, so
re-running only fills gaps. It reads existing documents in one batched
`getAll()` per city+type and writes in a single batch, rather than one round
trip per place.

**Cost.** Each city × category pair is one Nearby Search call. The field mask
requests Enterprise-tier fields (`editorialSummary`, `allowsDogs`, `restroom`,
`parkingOptions`, `goodForChildren`), which bills at the higher Places API rate.
A full 50-city run is 900 calls. Check current pricing before a full run.

**Place types.** All 18 categories in `src/lib/place-types.ts` are verified
against the live API. Three types from the original spec are rejected by Google
as "Unsupported types" and were replaced:

| Original | Replacement |
| --- | --- |
| `nature_reserve` | `wildlife_refuge` |
| `recreation_center` | `community_center` |
| `fishing_area` | `fishing_pond` |

If you add a type, confirm it exists in
[Places API Table A](https://developers.google.com/maps/documentation/places/web-service/place-types)
first — an invalid type fails every call for that type.

## Development

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
npx tsc --noEmit
```

Firestore reads degrade gracefully when the database or collection is empty —
`next build` warns and renders empty pages rather than failing. Any error other
than `NOT_FOUND` still propagates.

## SEO and AI discoverability

- **Static rendering** — every place, category and city page is prerendered
  (`dynamic = 'force-static'`), so crawlers get complete HTML with no JS
- **JSON-LD** on every page: `WebSite` + `Organization` site-wide,
  a per-category schema.org entity (`Park`, `Campground`, `RVPark`,
  `Playground`, …) with `geo`, `openingHours`, `aggregateRating` and
  `amenityFeature` on listings, plus `BreadcrumbList` and `ItemList`
- **`/sitemap.xml`** — generated from Firestore, covering listings, categories
  and cities. Google's ceiling is 50,000 URLs per file; past that, split into
  `generateSitemaps()` chunks with an index
- **`/robots.txt`** — names 19 AI crawlers explicitly (GPTBot, ClaudeBot,
  PerplexityBot, Google-Extended, …) so they're allowed by an unambiguous rule
- **`/llms.txt`** — [llmstxt.org](https://llmstxt.org) summary of what the site
  holds and how its URLs are shaped, for assistants reading the site directly
- Canonical URLs, OpenGraph and Twitter cards on every route, plus a generated
  OG image and a web manifest
- Internal linking: breadcrumbs, "more in this city" blocks, and category/city
  indexes, so no listing is orphaned

## Deployment

Pushes to `main` auto-deploy to Vercel. Set all five environment variables in
**Project → Settings → Environment Variables** before the first build — the
build reads Firestore, and `FIREBASE_PRIVATE_KEY` must keep its `\n` escapes.

## Repository layout

```
scripts/ingest-places.ts     Places API → Firestore ingestion
src/lib/firebase-admin.ts    Admin SDK singleton
src/lib/firestore.ts         Typed data access
src/lib/place-types.ts       Categories, labels, schema.org mapping
src/lib/site.ts              Site constants and URL helpers
src/components/              PlaceCard, PlaceGrid, JsonLd
src/app/                     Routes, sitemap, robots, llms.txt, manifest
firestore.indexes.json       Composite indexes
firestore.rules              Client access closed; all access is server-side
```
