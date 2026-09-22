import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { isAnalyticsAuthed } from '@/lib/analytics-auth'
import { DEFAULT_NOTIFY_EVERY, IGNORE_COOKIE, MAX_NOTIFY_EVERY, getNotifyEvery } from '@/lib/analytics'
import type { AccountsReport, SignupRow } from '@/lib/analytics-accounts'
import { MAX_CLICKS, type ClickReport, type ClickRow } from '@/lib/analytics-clicks'
import { MAX_EVENTS, type Coverage, type NearMeReport } from '@/lib/analytics-near-me'
import { loadReport, MAX_VISITS, RANGES, type Bucket, type RangeKey, type Row } from '@/lib/analytics-report'
import { cn } from '@/lib/utils'
import { login, logout, saveNotifyEvery, setSelfExclusion } from './actions'

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
}

// Longer ranges read tens of thousands of documents; don't let the host's default cut that off.
export const maxDuration = 60

type SearchParams = Promise<{ range?: string; bots?: string; error?: string; notify?: string }>

const number = new Intl.NumberFormat('en-US')
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 })

function duration(seconds: number): string {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}

function timestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  if (!(await isAnalyticsAuthed())) {
    return (
      <div className="mx-auto max-w-sm px-6 py-24">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-sm text-gray-500">Enter the password to view site analytics.</p>
        <form action={login} className="mt-6 space-y-3">
          <input
            type="password"
            name="password"
            autoFocus
            required
            placeholder="Password"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
          />
          {params.error && <p className="text-sm text-red-600">Wrong password.</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            View analytics
          </button>
        </form>
      </div>
    )
  }

  const range: RangeKey = params.range && params.range in RANGES ? (params.range as RangeKey) : '7'
  const includeBots = params.bots === '1'
  const selfExcluded = (await cookies()).get(IGNORE_COOKIE)?.value === '1'
  const [report, notifyEvery] = await Promise.all([loadReport(range, includeBots), getNotifyEvery()])
  const { totals } = report
  const href = (next: { range?: string; bots?: boolean }) =>
    `/analytics?range=${next.range ?? range}${(next.bots ?? includeBots) ? '&bots=1' : ''}`

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            {RANGES[range]} · all times UTC
            {report.allTimeCount !== null && (
              <> · {number.format(report.allTimeCount)} requests all-time (bots and files included)</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <form action={setSelfExclusion}>
            <input type="hidden" name="enable" value={selfExcluded ? '0' : '1'} />
            <button
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium',
                selfExcluded
                  ? 'border-green-700 bg-green-50 text-green-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
              )}
              title="This browser's own page views are otherwise counted like any other visitor's."
            >
              {selfExcluded ? '✓ Not tracking you' : 'Exclude my visits'}
            </button>
          </form>
          <form action={logout}>
            <button className="text-sm text-gray-500 hover:text-gray-900">Log out</button>
          </form>
        </div>
      </div>

      <form
        action={saveNotifyEvery}
        className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-600"
      >
        <label htmlFor="notify-every" className="font-medium text-gray-900">
          Telegram alerts
        </label>
        <span>ping me every</span>
        <input
          key={notifyEvery}
          id="notify-every"
          name="every"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_NOTIFY_EVERY}
          step={1}
          defaultValue={notifyEvery}
          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-gray-900"
        />
        <span>visits (bots included)</span>
        <button className="rounded-full border border-gray-200 px-3.5 py-1 font-medium hover:border-gray-300">Save</button>
        <span className={cn('text-xs', params.notify === 'invalid' ? 'text-red-600' : 'text-gray-400')}>
          {params.notify === 'invalid'
            ? `Enter a whole number from 0 to ${number.format(MAX_NOTIFY_EVERY)}.`
            : notifyEvery === 0
              ? 'Alerts are off. Enter a number to turn them back on.'
              : `0 turns alerts off · default ${DEFAULT_NOTIFY_EVERY}`}
        </span>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(Object.keys(RANGES) as RangeKey[]).map((key) => (
          <Link
            key={key}
            href={href({ range: key })}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium',
              key === range
                ? 'border-green-700 bg-green-700 text-white'
                : 'border-gray-200 text-gray-600 hover:border-gray-300',
            )}
          >
            {RANGES[key]}
          </Link>
        ))}
        <Link
          href={href({ bots: !includeBots })}
          className="ml-auto rounded-full border border-gray-200 px-3.5 py-1.5 text-sm text-gray-600 hover:border-gray-300"
        >
          {includeBots ? 'Hide bots' : 'Include bots'} ({number.format(totals.bots)})
        </Link>
      </div>

      {report.capped && report.coveredFrom && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          This range has more than {number.format(MAX_VISITS)} page views, so the figures below cover only{' '}
          {timestamp(report.coveredFrom)} UTC onward. Pick a shorter range for complete numbers.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Page views" value={number.format(totals.views)} hint="pages only — bots and files excluded" />
        <Stat
          label="Unique visitors"
          value={number.format(totals.visitors)}
          hint="by browser cookie; scrapers with fresh cookies inflate it"
        />
        <Stat
          label="Engaged visitors"
          value={number.format(totals.engagedVisitors)}
          hint="viewed 2+ pages or clicked something"
        />
        <Stat
          label="From search engines"
          value={number.format(totals.searchEngineVisitors)}
          hint="visitors referred by Google, Bing, etc."
        />
        <Stat label="New visitors" value={number.format(totals.newVisitors)} />
        <Stat label="Sessions" value={number.format(totals.sessions)} />
        <Stat label="Views in last hour" value={number.format(totals.lastHour)} />
        <Stat label="Pages / session" value={totals.pagesPerSession.toFixed(2)} />
        <Stat label="Bounce rate" value={percent.format(totals.bounceRate)} />
        <Stat label="Avg. session (multi-page)" value={duration(totals.avgSessionSeconds)} />
        <Stat
          label="Returning visitors"
          value={number.format(Math.max(0, totals.visitors - totals.newVisitors))}
        />
        <Stat label="Bot requests" value={number.format(totals.bots)} hint="exact count, files included" />
      </div>

      <Panel title={range === '1' ? 'Page views by hour' : 'Page views by day'} className="mt-6">
        <BarChart buckets={report.series} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Hour of day (UTC)">
          <BarChart buckets={report.hours} compact />
        </Panel>
        <Panel title="Day of week (UTC)">
          <BarChart buckets={report.weekdays} compact />
        </Panel>
      </div>

      <AccountsSection accounts={report.accounts} range={range} />

      <ClicksSection clicks={report.clicks} />

      <NearMeSection nearMe={report.nearMe} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RankPanel title="Top pages" rows={report.pages} link />
        <RankPanel title="Traffic sources (per session)" rows={report.referrers} />
        <RankPanel title="Entry pages" rows={report.entryPages} link />
        <RankPanel title="Exit pages" rows={report.exitPages} link />
        <RankPanel title="Site searches" rows={report.searches} />
        <RankPanel title="Campaigns (UTM)" rows={report.campaigns} />
        <RankPanel title="Countries" rows={report.countries} />
        <RankPanel title="States / regions" rows={report.regions} />
        <RankPanel title="Cities" rows={report.cities} />
        <RankPanel title="Devices" rows={report.devices} />
        <RankPanel title="Browsers" rows={report.browsers} />
        <RankPanel title="Operating systems" rows={report.os} />
        <RankPanel title="Languages" rows={report.languages} />
        <RankPanel title="Vercel edge regions" rows={report.edgeRegions} />
      </div>

      <Panel title="Most active visitors" className="mt-6">
        <Table
          head={['Visitor', 'Views', 'Sessions', 'Last seen', 'Location', 'IP', 'Device']}
          rows={report.topVisitors.map((v) => [
            <span key="id" className="font-mono text-xs">{v.id.slice(0, 8)}</span>,
            number.format(v.views),
            number.format(v.sessions),
            timestamp(v.lastSeen),
            v.location,
            v.ip ?? '—',
            v.device,
          ])}
        />
      </Panel>

      {report.botAgents.length > 0 && (
        <Panel title="Bot user agents (from the most recent bot hits)" className="mt-6">
          <Table
            head={['User agent', 'Hits']}
            rows={report.botAgents.map((row) => [
              <span key="ua" className="break-all">{row.label}</span>,
              number.format(row.count),
            ])}
          />
        </Panel>
      )}

      <Panel title={`Recent page views (${report.recent.length})`} className="mt-6">
        <Table
          head={['Time', 'Page', 'Referrer', 'Location', 'Device', 'Visitor', 'IP', 'Language', 'User agent']}
          rows={report.recent.map((v) => [
            timestamp(v.ts),
            <a key="p" href={`${v.path}${v.query ?? ''}`} className="text-green-700 hover:underline">
              {v.path}
              {v.query ?? ''}
            </a>,
            v.referrer ? <span key="r" className="break-all">{v.referrer}</span> : '—',
            [v.flag, v.city, v.countryRegion, v.country].filter(Boolean).join(' ') || '—',
            `${v.device} · ${v.browser} · ${v.os}${v.bot ? ' · bot' : ''}`,
            <span key="v" className="font-mono text-xs">
              {v.visitorId?.slice(0, 8) ?? '—'}
              {v.newVisitor ? ' (new)' : ''}
            </span>,
            v.ip ?? '—',
            v.language ?? '—',
            <span key="ua" className="block max-w-xs truncate" title={v.userAgent ?? ''}>
              {v.userAgent ?? '—'}
            </span>,
          ])}
        />
      </Panel>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-xs">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

const REGION_LABEL: Record<string, string> = { header: 'Header', footer: 'Footer', dialog: 'Pop-up', page: 'Page body' }

function ClickTable({ rows }: { rows: ClickRow[] }) {
  return (
    <Table
      head={['Name', 'Where', 'People', 'Clicks', '% of visitors', 'Mostly on']}
      rows={rows.map((row) => [
        <span key="l" className="font-medium text-gray-900">{row.label}</span>,
        REGION_LABEL[row.region] ?? row.region,
        number.format(row.people),
        number.format(row.clicks),
        percent.format(row.reach),
        <span key="p" className="break-all">{row.topPage}</span>,
      ])}
    />
  )
}

const METHOD_LABEL: Record<SignupRow['method'], string> = {
  'google.com': 'Google',
  'email code': 'Email code',
}

function SignupTable({ rows }: { rows: SignupRow[] }) {
  return (
    <Table
      head={['Email', 'Method', 'Signed up', 'Last signed in']}
      rows={rows.map((row) => [
        <span key="e" className="font-medium text-gray-900">{row.email}</span>,
        METHOD_LABEL[row.method],
        timestamp(row.createdAt),
        row.lastSignedIn ? timestamp(row.lastSignedIn) : '—',
      ])}
    />
  )
}

/**
 * Accounts created through the sign-in popup (see components/auth), and what
 * they have saved. Sign-up figures come from Firebase Auth directly — it is
 * the only place the account and its method live — while saved-place figures
 * come from Firestore, which is what actually holds them.
 */
function AccountsSection({ accounts, range }: { accounts: AccountsReport; range: RangeKey }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight text-gray-900">Accounts</h2>
      <p className="mt-1 text-sm text-gray-500">
        People who signed in through the pop-up, and what they have saved. This page shows full
        email addresses — keep the dashboard password real and don&apos;t share this link.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Accounts, all time" value={number.format(accounts.totals.allTime)} />
        <Stat
          label="New sign-ups"
          value={number.format(accounts.totals.inRange)}
          hint={RANGES[range]}
        />
        <Stat label="via Google" value={number.format(accounts.totals.google)} hint={RANGES[range]} />
        <Stat
          label="via email code"
          value={number.format(accounts.totals.emailCode)}
          hint={RANGES[range]}
        />
        <Stat
          label="Accounts with a saved place"
          value={number.format(accounts.totals.withSaves)}
        />
        <Stat label="Places saved" value={number.format(accounts.savedPlaces.total)} />
      </div>

      <Panel title={range === '1' ? 'Sign-ups by hour' : 'Sign-ups by day'} className="mt-6">
        {accounts.series.every((b) => b.count === 0) ? (
          <p className="text-sm text-gray-400">No sign-ups in this range yet.</p>
        ) : (
          <BarChart buckets={accounts.series.map((b) => ({ ...b, visitors: b.count }))} />
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RankPanel title="Most saved places" rows={accounts.mostSaved} />
        <Panel title="Wishlist vs. visited">
          {accounts.savedPlaces.total === 0 ? (
            <p className="text-sm text-gray-400">No saves yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between">
                <span className="text-gray-600">Want to go</span>
                <span className="tabular-nums text-gray-900">
                  {number.format(accounts.savedPlaces.wishlist)}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-600">Been there</span>
                <span className="tabular-nums text-gray-900">
                  {number.format(accounts.savedPlaces.visited)}
                </span>
              </li>
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={`Recent sign-ups (${accounts.recent.length})`} className="mt-6">
        <SignupTable rows={accounts.recent} />
      </Panel>
    </section>
  )
}

/**
 * What people do on the site, from the click tracker. "People" counts distinct
 * visitors, so ten clicks by one person is one person, not ten.
 */
function ClicksSection({ clicks }: { clicks: ClickReport }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight text-gray-900">Buttons and links clicked</h2>
      <p className="mt-1 text-sm text-gray-500">
        Every button and link press by real visitors (bots excluded), ranked by how many different people pressed
        it. Links are named by where they go; place pages are grouped as /places/:slug. Tracking began when this
        was deployed, so earlier days show nothing.
      </p>

      {clicks.capped && (
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Showing the most recent {number.format(MAX_CLICKS)} clicks only — pick a shorter range for complete numbers.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clicks" value={number.format(clicks.totals.clicks)} />
        <Stat label="People who clicked" value={number.format(clicks.totals.clickers)} />
        <Stat label="Visitors who clicked anything" value={percent.format(clicks.totals.clickerRate)} />
        <Stat label="Clicks per person" value={clicks.totals.clicksPerClicker.toFixed(1)} />
      </div>

      <Panel title="Buttons" className="mt-4">
        <ClickTable rows={clicks.buttons} />
      </Panel>
      <Panel title="Links" className="mt-4">
        <ClickTable rows={clicks.links} />
      </Panel>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <Panel title="Pages where people click most">
          <Table
            head={['Page', 'People', 'Clicks']}
            rows={clicks.pages.map((row) => [
              <a key="p" href={row.label} className="break-all text-green-700 hover:underline">{row.label}</a>,
              number.format(row.people),
              number.format(row.count),
            ])}
          />
        </Panel>
        <Panel title={`Recent clicks (${clicks.recent.length})`}>
          <Table
            head={['Time', 'Clicked', 'On', 'Device']}
            rows={clicks.recent.map((row) => [
              timestamp(row.ts),
              <span key="c" className="break-all">{row.label}</span>,
              <span key="p" className="break-all">{row.path}</span>,
              `${row.device}${row.country ? ` · ${row.country}` : ''}`,
            ])}
          />
        </Panel>
      </div>
    </section>
  )
}

const COVERAGE_STYLE: Record<Coverage, string> = {
  None: 'bg-red-50 text-red-700',
  Thin: 'bg-amber-50 text-amber-800',
  Covered: 'bg-green-50 text-green-800',
}

/**
 * The "Find near me" button and what people do with it. Demand is what they
 * search for; supply is how many places we hold within 25 miles of that spot.
 * An area near the top of the table marked "None" or "Thin" is where to
 * ingest next.
 */
function NearMeSection({ nearMe }: { nearMe: NearMeReport }) {
  const { clicks, searches } = nearMe
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight text-gray-900">Near me: demand vs supply</h2>
      <p className="mt-1 text-sm text-gray-500">
        Searches are demand. Supply is the number of places we have within 25 miles of the spot
        searched. Exact locations are never stored — GPS is kept to about 7 miles.
      </p>

      {nearMe.capped && (
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Showing the most recent {number.format(MAX_EVENTS)} events only — pick a shorter range for
          complete numbers.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          label="Button clicks"
          value={number.format(clicks.total)}
          hint={`${number.format(clicks.floating)} floating · ${number.format(clicks.hero)} hero`}
        />
        <Stat label="Sessions that clicked" value={percent.format(clicks.sessionRate)} />
        <Stat label="/near-me page views" value={number.format(nearMe.pageViews)} />
        <Stat
          label="Searches"
          value={number.format(searches.total)}
          hint={`${number.format(searches.gps)} GPS · ${number.format(searches.lookup)} typed`}
        />
        <Stat
          label="Found places nearby"
          value={number.format(searches.found - searches.unserved)}
          hint="at least one within 25 mi"
        />
        <Stat
          label="Unserved searches"
          value={number.format(searches.unserved)}
          hint="nothing within 25 mi"
        />
        <Stat label="Place not recognised" value={number.format(searches.notFound)} />
        <Stat label="GPS failed / denied" value={number.format(searches.gpsFailed)} />
      </div>

      <Panel title="Where people search" className="mt-4">
        <Table
          head={['Area', 'Searches', 'Visitors', 'Avg places ≤ 25 mi', 'Avg nearest', 'Coverage']}
          rows={nearMe.areas.map((row) => [
            row.area,
            number.format(row.searches),
            number.format(row.visitors),
            row.avgWithin25.toFixed(1),
            row.avgNearest === null ? '—' : `${row.avgNearest.toFixed(1)} mi`,
            <span
              key="c"
              className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', COVERAGE_STYLE[row.coverage])}
            >
              {row.coverage}
            </span>,
          ])}
        />
      </Panel>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <RankPanel title="Floating button clicks by page" rows={nearMe.clickPages} link />
        <RankPanel title="Places we couldn’t recognise" rows={nearMe.missed} />
      </div>

      <Panel title={`Recent near-me searches (${nearMe.recent.length})`} className="mt-4">
        <Table
          head={['Time', 'How', 'Searched for', '≤ 10 mi', '≤ 25 mi', '≤ 50 mi', 'Nearest', 'Device', 'Country']}
          rows={nearMe.recent.map((row) => [
            timestamp(row.ts),
            row.method === 'gps' ? 'GPS' : 'Typed',
            row.what || '—',
            row.within10 ?? '—',
            row.within25 ?? '—',
            row.within50 ?? '—',
            row.nearest === null ? '—' : `${row.nearest} mi`,
            row.device,
            row.country ?? '—',
          ])}
        />
      </Panel>
    </section>
  )
}

function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('rounded-xl border border-gray-100 bg-white p-5 shadow-xs', className)}>
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function BarChart({ buckets, compact }: { buckets: Bucket[]; compact?: boolean }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const labelEvery = Math.ceil(buckets.length / (compact ? 12 : 10))
  return (
    <div>
      <div className={cn('relative flex items-end gap-0.5 border-b border-gray-200', compact ? 'h-32' : 'h-56')}>
        <span className="absolute -top-1 left-0 text-[11px] tabular-nums text-gray-400">{number.format(max)}</span>
        {buckets.map((b) => (
          <div key={b.label} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-green-700 transition-colors group-hover:bg-green-900"
              style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count ? 2 : 0 }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block">
              <p className="font-medium">{b.label}</p>
              <p className="tabular-nums">
                {number.format(b.count)} views · {number.format(b.visitors)} visitors
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-0.5">
        {buckets.map((b, i) => (
          <span key={b.label} className="flex-1 truncate text-center text-[10px] text-gray-400">
            {i % labelEvery === 0 ? (b.label.length === 10 ? b.label.slice(5) : b.label) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function RankPanel({ title, rows, link }: { title: string; rows: Row[]; link?: boolean }) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No data yet.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.label} className="relative flex items-center justify-between gap-3 rounded px-2 py-1 text-sm">
              <div className="absolute inset-y-0 left-0 rounded bg-green-50" style={{ width: `${row.share * 100}%` }} />
              <span className="relative truncate text-gray-700" title={row.label}>
                {link && row.label.startsWith('/') ? (
                  <a href={row.label} className="hover:text-green-700 hover:underline">{row.label}</a>
                ) : (
                  row.label
                )}
              </span>
              <span className="relative shrink-0 tabular-nums text-gray-900">
                {number.format(row.count)}
                <span className="ml-2 inline-block w-12 text-right text-gray-400">{percent.format(row.share)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">No data yet.</p>
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-500">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-5 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-gray-50 align-top last:border-0">
              {cells.map((cell, j) => (
                <td key={j} className="px-5 py-2 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
