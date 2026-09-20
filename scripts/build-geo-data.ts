/**
 * Builds the offline lookup tables behind /api/locate ("near me" by ZIP or city).
 *
 * Source: US Census Bureau Gazetteer files — public domain, so no attribution
 * or licence terms attach to the output. Fetching them once and bundling the
 * result means locating a visitor costs no API calls and no per-request fee,
 * and there is no key to leak or endpoint to abuse.
 *
 *   curl -LO https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip
 *   curl -LO https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip
 *   # unzip both, then:
 *   npx tsx scripts/build-geo-data.ts <folder holding the two .txt files>
 *
 * Writes src/data/us-zips.json and src/data/us-places.json. Both are committed:
 * they change roughly once a year, not per build.
 *
 * Caveat worth knowing: the ZIP table is Census ZCTAs, which cover residential
 * ZIPs but not PO-box-only or single-organisation ZIPs. A ZIP missing here
 * simply reports "not found" and the visitor falls back to a city name.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('Usage: npx tsx scripts/build-geo-data.ts <folder with the Gazetteer .txt files>')
  process.exit(1)
}

/** Tab-separated with a header row; the last column is space-padded. */
function readTable(file: string): Record<string, string>[] {
  const [head, ...rows] = fs
    .readFileSync(path.join(dir, file), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
  const cols = head.split('\t').map((c) => c.trim())
  return rows.map((row) => {
    const cells = row.split('\t')
    return Object.fromEntries(cols.map((col, i) => [col, (cells[i] ?? '').trim()]))
  })
}

// Three decimals is ~110 m — far finer than "which parks are near me" needs.
const round = (value: string) => Math.round(Number(value) * 1000) / 1000

// --- ZIP codes ---------------------------------------------------------------

const zips = readTable('2024_Gaz_zcta_national.txt')
  .map((row) => [row.GEOID, round(row.INTPTLAT), round(row.INTPTLONG)] as const)
  .filter(([zip, lat, lng]) => /^\d{5}$/.test(zip) && Number.isFinite(lat) && Number.isFinite(lng))

// --- Places (cities, towns, CDPs) --------------------------------------------

/** Census appends a legal-status word to every name: "Austin city", "Katy city". */
const LEGAL_SUFFIX =
  /\s+(?:city and borough|consolidated government|metropolitan government|metro government|unified government|urban county|municipality|borough|village|township|town|city|CDP)(?:\s+\(balance\))?$/i

/** Where the Census name and the name people type genuinely differ. */
const OVERRIDES: Record<string, string> = { 'Boise City': 'Boise', 'Urban Honolulu': 'Honolulu' }

function displayName(census: string): string {
  const merged = /consolidated|metropolitan|metro government|unified|urban county/i.test(census)
  let name = census.replace(/\s+\(balance\)$/i, '').replace(LEGAL_SUFFIX, '').trim()
  // "Nashville-Davidson", "Louisville/Jefferson County": people type the first half.
  if (merged) name = name.split(/[-/]/)[0].trim()
  return OVERRIDES[name] ?? name
}

const places = readTable('2024_Gaz_place_national.txt')
  .map(
    (row) =>
      [
        displayName(row.NAME),
        row.USPS,
        round(row.INTPTLAT),
        round(row.INTPTLONG),
        // Land area stands in for size when a name is shared by several places —
        // the Gazetteer carries no population.
        Math.round(Number(row.ALAND_SQMI)),
      ] as const,
  )
  .filter(([name, state, lat, lng]) => name && state && Number.isFinite(lat) && Number.isFinite(lng))

const out = (file: string, data: unknown) => {
  const target = path.resolve(process.cwd(), 'src', 'data', file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, JSON.stringify(data))
  console.log(`   ${file}: ${(fs.statSync(target).size / 1024).toFixed(0)} KB`)
}

console.log(`📍 ${zips.length} ZIP codes · ${places.length} places`)
out('us-zips.json', zips)
out('us-places.json', places)
