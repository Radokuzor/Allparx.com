/**
 * Builds `src/data/hosting-ranges.json`, the datacenter/proxy IP table that
 * `src/lib/hosting.ts` searches. Run it when the table gets stale:
 *
 *   node scripts/build-hosting-ranges.mjs
 *
 * Two inputs, on purpose:
 *   1. X4BNet/lists_vpn's curated datacenter list — broad coverage, updated
 *      daily upstream, but it lags on freshly allocated cloud space.
 *   2. iptoasn.com's full IPv4→ASN table filtered to the hosting ASNs below —
 *      catches allocations the curated list has not picked up yet.
 *
 * ASNs of consumer ISPs are deliberately absent. ip-api's "hosting" flag
 * miscategorises a few cable and mobile carriers as hosting (Wave Broadband,
 * Telmex, Telkomsel); a real reader must never be filtered out because of it.
 *
 * The output is a sorted, coalesced array of [first, last] uint32 pairs. The
 * script prints precision and recall against whatever traffic sample is left
 * in /tmp/allparx from the audit that built the first version — if that file
 * is gone, it just prints the range count.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HOSTING_ASNS = new Set([
  // Cloud
  '16509', '14618', '8987', '396982', '19527', '15169', '8075', '31898', '36351',
  // Alibaba / Tencent
  '45102', '37963', '132203',
  // VPS and dedicated hosting
  '14061', '393406', '200130', '63949', '20940', '16625', '20473', '64515',
  '24940', '213230', '16276', '51167', '9009', '36352', '60781', '28753', '8560',
  '47583', '22612', '40676', '204548', '54825', '202053', '12876', '197540',
  '63473',
  // CDN and proxy infrastructure
  '13335', '54113', '62874', '64286', '18779', '46261', '47007', '21769', '16628',
  '200373', '396319', '137280', '30058', '43444', '7979', '206216', '49581',
  '218785', '212238', '55286', '26548', '21859', '50131', '207990', '14956',
  '151474', '35830', '20278', '19084', '10557', '198093', '60729', '3257',
])

const OUT = path.join(process.cwd(), 'src', 'data', 'hosting-ranges.json')
const TMP = path.join(process.cwd(), '.hosting-build')

const ipv4ToInt = (ip) => {
  const parts = ip.split('.').map(Number)
  return (parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3]) >>> 0
}

async function download(url, file) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} → ${response.status}`)
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()))
  return file
}

async function main() {
  fs.mkdirSync(TMP, { recursive: true })

  const [dcFile, asnFile] = await Promise.all([
    download('https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt', path.join(TMP, 'dc-ipv4.txt')),
    download('https://iptoasn.com/data/ip2asn-v4.tsv.gz', path.join(TMP, 'ip2asn-v4.tsv.gz')),
  ])

  const rows = []

  for (const cidr of fs.readFileSync(dcFile, 'utf8').trim().split('\n')) {
    const [network, bitsRaw] = cidr.trim().split('/')
    const bits = Number(bitsRaw)
    if (!network || Number.isNaN(bits)) continue
    const first = ipv4ToInt(network)
    rows.push([first, first + 2 ** (32 - bits) - 1])
  }

  const asnText = execFileSync('gzip', ['-dc', asnFile], { maxBuffer: 1 << 28 }).toString()
  let asnRanges = 0
  for (const line of asnText.split('\n')) {
    if (!line) continue
    const [first, last, asn] = line.split('\t')
    if (!HOSTING_ASNS.has(asn)) continue
    rows.push([ipv4ToInt(first), ipv4ToInt(last)])
    asnRanges++
  }

  rows.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const [first, last] of rows) {
    const previous = merged[merged.length - 1]
    if (previous && first <= previous[1] + 1) previous[1] = Math.max(previous[1], last)
    else merged.push([first, last])
  }

  fs.writeFileSync(OUT, JSON.stringify(merged))
  fs.rmSync(TMP, { recursive: true, force: true })

  const size = (fs.statSync(OUT).size / 1e6).toFixed(2)
  console.log(`hosting-ranges.json: ${merged.length} ranges, ${size}MB`)
  console.log(`  ${rows.length - asnRanges} CIDRs from the curated datacenter list`)
  console.log(`  ${asnRanges} ranges from ${HOSTING_ASNS.size} hosting ASNs`)

  const samplePath = '/tmp/allparx/sample.json'
  const metaPath = '/tmp/allparx/ipmeta.json'
  if (fs.existsSync(samplePath) && fs.existsSync(metaPath)) {
    const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'))
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    const notHosting = new Set(['11404', '10620', '3816', '19429', '16591', '23693', '271773', '28075', '52308', '52436', '19935'])
    const contains = (ip) => {
      const value = ipv4ToInt(ip)
      let low = 0
      let high = merged.length - 1
      while (low <= high) {
        const mid = (low + high) >> 1
        if (value < merged[mid][0]) high = mid - 1
        else if (value > merged[mid][1]) low = mid + 1
        else return true
      }
      return false
    }
    let tp = 0
    let fp = 0
    let fn = 0
    let tn = 0
    for (const row of sample) {
      const known = meta[row.ip]
      if (!known || known.status !== 'success') continue
      const asn = (known.as || '').split(' ')[0].replace('AS', '')
      if (notHosting.has(asn)) continue
      const truth = Boolean(known.hosting)
      const got = contains(row.ip)
      if (truth && got) tp++
      else if (!truth && got) fp++
      else if (truth && !got) fn++
      else tn++
    }
    const precision = (tp / (tp + fp)) * 100
    const recall = (tp / (tp + fn)) * 100
    console.log(`  self-check vs ip-api sample: precision ${precision.toFixed(1)}%, recall ${recall.toFixed(1)}% (${tn} clean hits kept)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
