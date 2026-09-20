# Semrush domain snapshot — allparx.com (Sep 2026)

Screenshots of the Semrush Domain Overview for allparx.com, taken while
evaluating the site before purchase. Domain Overview date: **Sep 12, 2026**,
Worldwide, Desktop, USD. Kept as a baseline to compare against later.

Numbers below are transcribed from the screenshots. Anything I could not read
clearly is marked as such.

## Headline numbers (`01-domain-overview.png`)

| Metric | Value |
| --- | --- |
| Authority Score | 24 (Average) |
| Organic traffic | 2.8K/mo (−27%) |
| Organic keywords | 73 (+5.8%) |
| Referring domains | 352 |
| Backlinks | 1.4K |
| Paid traffic / keywords | 0 / 0 |
| Traffic share (US) | 16% |
| AI visibility | 0 (0 mentions, 3 cited pages — all ChatGPT) |

## Keywords that drive the traffic (`02-top-keywords-and-intent.png`)

Almost all of the traffic comes from one unrelated topic: **banyan trees**.

| Keyword | Intent | Volume | CPC (US) | Traffic % |
| --- | --- | --- | --- | --- |
| banyan tree banyan | Commercial | 22.2K | 0.69 | 66.56 |
| the banyan tree | Commercial | 3.6K | 0.96 | 10.79 |
| banyan tree hawaii | Info / Transactional | 1.3K | 0.26 | 3.07 |
| historic banyan tree | Commercial | 260 | 0.00 | 2.34 |
| hole in the wall beach nia… (truncated) | Info / Transactional | 1K | 0.22 | 1.28 |

The Traffic column is **percent of domain traffic**, not visits — the five rows
sum to ~84%. So the banyan cluster alone is ~83% of 2.8K ≈ **2.3K visits/month**,
which reconciles with the 2.3K against the 13 commercial keywords below.

The Pos. column shows SERP-feature icons rather than numeric rankings, and the
position chart shows **90.4% of positions are "Other SERP features"** vs 9.6%
classic organic (`04-traffic-and-keywords-2y.png`). So the banyan rankings are
mostly a SERP-feature presence, not ten-blue-link positions.

Keywords by intent:

| Intent | Share | Keywords | Traffic |
| --- | --- | --- | --- |
| Informational | 66.7% | 52 | 442 |
| Navigational | 2.6% | 2 | 0 |
| Commercial | 16.7% | 13 | 2.3K |
| Transactional | 14.1% | 11 | 217 |

The 13 commercial keywords carry ~2.3K of the ~2.8K traffic. That is the
"purchase intent" traffic — and it is the banyan cluster, not outdoor recreation.

## Organic competitors (`03-intent-and-organic-competitors.png`)

394 competitors listed. Top five:

| Competitor | Common keywords | SE keywords |
| --- | --- | --- |
| bomackison.com | 4 | 82 |
| banyantreefresno.com | 7 | 417 |
| banyantreekapalua.com | 7 | 449 |
| waikikioutdoorcircle.org | 3 | 131 |
| banyantreecounseling.com | 7 | 335 |

Every banyan competitor is a business named "Banyan Tree" (Fresno, Kapalua,
counseling). The overlap is the brand/local search term, not a topic AllParx
covers.

## Traffic history (`04-…`, `05-…`)

2-year view. Organic keyword count peaked around 300 in late 2024, collapsed to
under 50, and has been climbing again since mid-2026 (~76 in Sep 2026). Traffic
had large spikes in mid/late 2025 (peak ~12.6K) and has sat around 2–4K since.
`05-…` is the same chart with a cookie banner covering the bottom; kept only
because it was in the original capture.

## Backlinks (`06-backlinks-anchors-referring-domains.png`)

Anchor types: text 94% (1.4K), image 6% (85), form 0, frame 0.

| Top anchor | Domains | Backlinks |
| --- | --- | --- |
| allparx.com | 132 | 317 |
| website | 36 | 261 |
| visit website | 30 | 115 |
| "high quality dofollow backlinks da 50 p…" | 65 | 99 |
| visit site location on google map | 1 | 82 |

| Top referring domain | Backlinks |
| --- | --- |
| theswimmingacademy.com | 274 |
| exploreoc.com | 84 |
| bizarchive.com | 75 |
| gymbird.com | 46 |
| bizdir24.com | 45 |

Also visible: wanderlog.com list pages linking to `/places/burbank-peak/` and
`/places/stanley-canyon-re…`. The "high quality dofollow backlinks da 50"
anchor and the bizarchive/bizdir24-style directories look like purchased or
spam link-building; worth auditing before assuming all 1.4K links are an asset.

## Pages with backlinks (`07-indexed-pages.png`)

| URL | Ref. domains | Backlinks |
| --- | --- | --- |
| https://allparx.com/ | 86 | 156 |
| http://allparx.com/ | 25 | 40 |
| https://allparx.com/places/hole-in-the-wall-beach/ | 7 | 12 |
| https://allparx.com/places/k9-cody-dog-park/ | 7 | 12 |
| https://www.allparx.com/ | 7 | 19 |

The old place URLs are **name-only slugs with a trailing slash**
(`/places/hole-in-the-wall-beach/`), not `{name}-{city}`. As of this snapshot
`hole-in-the-wall-beach`, `k9-cody-dog-park`, `burbank-peak` and
`stanley-canyon-reservoir-trailhead` all exist as slugs in
`.allparx-cache/places.json`, so those backlinks still land on a real page.

## Diagnosis — where the banyan traffic comes from

**Resolved 2026-09-20.** The rankings belong to the *previous* allparx.com (a
WordPress/GeoDirectory site); this repo is a rebuild on a purchased domain, so
none of it is connected to the current code.

The banyan traffic is **one page**: `https://allparx.com/places/banyan-tree/`.
It covered the banyan tree at 57 Kamehameha Hwy, Haleiwa/Kahuku, Oahu — a
*Pirates of the Caribbean* filming location. Wanderlog still links to it
([wanderlog.com/place/details/786824/banyan-tree](https://wanderlog.com/place/details/786824/banyan-tree)).

**That URL is a 404 today:**

```
https://allparx.com/places/banyan-tree/
  → 308 https://www.allparx.com/places/banyan-tree/
  → 404                                    (2 hops)
```

One 404 is sitting on ~83% of the domain's organic traffic. The −27% traffic
trend is that page decaying out of the index.

### What the old site was made of

From the Wayback CDX index (`web.archive.org/cdx/search/cdx?url=allparx.com*`):

| Cluster | Distinct archived URLs |
| --- | --- |
| `/faq-wisconsin-parks/<question>/` | 306 |
| `/places/<name>/` | 80 |
| `/category/{national-parks,state-parks,wisconsin,new-mexico,festivals,winter,equipment,spotlight}/` | ~12 |

So it was mostly an informational FAQ cluster plus a smaller place directory —
which explains why 52 of the 73 surviving keywords are informational. The
current site has no editorial content at all, only Places API fields.

A partial slug inventory is saved at
[`../legacy-place-slugs-wayback.txt`](../legacy-place-slugs-wayback.txt) (41
slugs). It is **incomplete** — Wayback never archived everything, and
`banyan-tree` is not even in it. The authoritative sources are the Semrush
*Indexed Pages* export and Google Search Console.

### How this interacts with `scripts/restore-legacy.ts`

That script already exists for exactly this problem. It does **not** carry a
hardcoded slug list — it reads the analytics `visits` collection in Firestore
and restores slugs that actually took 404 hits (`--organic-only`, `--min-hits`).
That means it only reaches a URL *after* traffic has already hit the 404, and
never reaches URLs that are indexed but currently unvisited.

## Open questions

- Hostname canonicalisation: the site now canonicalises to **www**, but Semrush
  lists `https://allparx.com/` (86 ref. domains), `http://allparx.com/` (25) and
  `https://www.allparx.com/` (7) separately. `http://allparx.com/` takes two
  hops. Worth collapsing to one.
- Whether `/places/banyan-tree/` can be rebuilt as a page good enough to hold
  the ranking — a thin Places-API card under 2.3K visits/month will bounce.
