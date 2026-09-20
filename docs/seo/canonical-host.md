# Canonical host: the site and the server disagree

**Status: needs a Vercel dashboard change. Not fixable in this repo.**

## The problem

The application declares the **apex** domain as canonical:

| Where | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` (`.env.local`, `.env.example`) | `https://allparx.com` |
| `<link rel="canonical">` on every page | `https://allparx.com/…` |
| `og:url` | `https://allparx.com/…` |
| All ~1,876 `/sitemap.xml` entries | `https://allparx.com/…` |

The server does the opposite — Vercel 308s the apex to **www**:

```
$ curl -sI https://allparx.com/places/burbank-peak
HTTP/1.1 308 Permanent Redirect
Location: https://www.allparx.com/places/burbank-peak
Server: Vercel
```

So every canonical URL the site publishes, and every URL in the sitemap,
immediately redirects somewhere else. A legacy backlink costs two hops:

```
https://allparx.com/places/burbank-peak/   (as linked, with trailing slash)
  → 308 https://www.allparx.com/places/burbank-peak
  → 200                                              (2 hops)
```

It is not fatal — Google follows redirects and will settle on www — but the
site is arguing with itself, and it is arguing for the wrong side.

## Why apex should win

From the Semrush snapshot (`semrush-2026-09-12/07-indexed-pages.png`), the
inbound links are overwhelmingly on the apex:

| Host | Referring domains | Backlinks |
| --- | --- | --- |
| `https://allparx.com/` | 86 | 156 |
| `http://allparx.com/` | 25 | 40 |
| `https://www.allparx.com/` | 7 | 19 |

About 111 referring domains point at the apex against 7 at www. The current
configuration sends all 111 through a redirect to reach a host that 7 point at,
and contradicts the site's own canonical tags while doing it.

## The fix

In the Vercel dashboard → **Project → Settings → Domains**:

1. Set `allparx.com` as the **primary** domain.
2. Change `www.allparx.com` to redirect to `allparx.com` (currently reversed).

Nothing in this repo changes: `NEXT_PUBLIC_SITE_URL`, the canonical tags and the
sitemap already say `https://allparx.com`, and they become correct the moment
the redirect flips.

If you would rather keep **www** as canonical, the repo change is to set
`NEXT_PUBLIC_SITE_URL=https://www.allparx.com` in Vercel's environment variables
and redeploy, so canonicals and the sitemap follow the server. That is the
weaker option — it moves 111 referring domains onto the redirected side.

## Verifying afterwards

```bash
# should be 200 with no redirect
curl -s -o /dev/null -w "%{http_code} %{num_redirects}\n" https://allparx.com/places/banyan-tree

# should be a single 308 to the apex
curl -sI https://www.allparx.com/places/banyan-tree | grep -i "^location"
```

## Related, but deliberately not changed

Legacy WordPress URLs all carried a trailing slash (`/places/banyan-tree/`) and
Next.js is on the default `trailingSlash: false`, so each one costs a further
redirect. Setting `trailingSlash: true` would save that hop for legacy links but
would move every *current* URL — all of them already indexed without a slash —
and force a sitemap and canonical rewrite. Not worth it; fixing the host is
where the value is.
