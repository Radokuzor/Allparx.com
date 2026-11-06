# How visitor counting works

Written 2026-11-05, when the dashboard was still reporting ~19k "visitors" a
week whose top cities were Ashburn, Haifa and Boardman — datacenter addresses,
not people. Everything below describes how a request becomes a visitor now.

## The two-step model

**1. The proxy records a request** (`src/proxy.ts` → `trackVisit`). Every page
hit writes one document to `analytics_visits` with the path, referrer, geo,
user agent and IP. It also sets three cookies:

| Cookie | Lifetime | Read by | Purpose |
| --- | --- | --- | --- |
| `ap_vid` | 2 years | server | visitor id |
| `ap_sid` | 30 min | server | session id |
| `ap_hit` | 10 min | browser JS | which document this page view is |

Nothing is counted at this step. A request on its own is not evidence of a
person, because a scraper makes exactly the same request.

**2. The page phones home** (`src/components/PageViewBeacon.tsx` →
`POST /api/pageview`). After paint, a small script reads `ap_hit` and reports
what only a rendering browser has: screen size, timezone, language list,
`navigator.webdriver`, hardware concurrency, touch support and the WebGL
renderer. The server judges those signals and stamps the hit.

A page view counts as a person only when this second step agrees. Anything
else is stored as **unverified**: visible on the dashboard, never in the
visitor numbers.

## The three buckets

| Bucket | Test | Shown as |
| --- | --- | --- |
| Person | beacon verified, not a known crawler | Visitors, page views, everything in the cards |
| Unverified | no beacon proof: no JavaScript, or a hosting/proxy IP | "Unverified" card |
| Crawler | user agent, stale Chrome, Googlebot range | "Include bots" view only |

`human` is `null` on documents from before the beacon shipped. Those fall back
to IP reputation, so history does not vanish on deploy day — but they are why
older ranges still look inflated compared with new ones.

## Hosting detection

`src/lib/hosting.ts` binary-searches 35k coalesced [first, last] IPv4 ranges
built from two sources:

- the curated datacenter list at `X4BNet/lists_vpn`
- iptoasn.com's IPv4→ASN table, filtered to ~70 hosting ASNs (AWS, GCP, Azure,
  Oracle, Hetzner, OVH, Contabo, M247, ColoCrossing, DigitalOcean, Tencent,
  Alibaba, Oxylabs, the proxy farms spotted in this site's own logs)

Regenerate with `npm run hosting:build`. The script self-checks against a
traffic sample if one is left in `/tmp/allparx`; the current table scores
99.7% recall and 84% precision against ip-api's classification.

Being flagged is a downgrade, not a conviction. A real person behind a
corporate VPN still becomes a person when their browser sends the beacon. The
flag only decides what happens to hits that never prove anything.

Consumer ISPs are deliberately absent. ip-api mislabels Wave Broadband,
Telmex and Telkomsel as hosting; a home reader must never be filtered out.

## Privacy

The beacon collects no identifiers beyond the random ids the site already sets.
No IP is stored in the subscription record, no fingerprint is computed, no
third-party script is involved, and the visitor id is a random UUID rather than
anything derived from the device. `/analytics` itself is excluded from
tracking, and "Exclude my visits" sets `ap_ignore`.

## Web push

`/near-me` offers "notify me when new places are added near you". That stores a
push subscription plus a location rounded to one decimal (~7 miles) in
`push_subscriptions`. `/api/push/send` runs weekly from `vercel.json` and only
sends when places were actually added within 40 miles since the last message.

Environment required in Vercel:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT=mailto:hello@allparx.com
CRON_SECRET
```

## What the numbers mean now

- The all-time figure to quote is `analytics/peopleCounter` — verified page
  views since the beacon shipped. It starts at zero on deploy day on purpose.
- `analytics/visitCounter` is the old raw figure. It is left alone and labelled
  as raw rather than quietly rewritten.
- Expect the weekly visitor count to drop by roughly half, sometimes more.
  That is the point: the smaller number is the true one.
