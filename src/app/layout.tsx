import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { LocateFixed, Search, TreePine } from 'lucide-react'
import Link from 'next/link'
import './globals.css'
import AuthProvider from '@/components/auth/AuthProvider'
import ClickTracker from '@/components/ClickTracker'
import TidyUrl from '@/components/TidyUrl'
import UserMenu from '@/components/auth/UserMenu'
import FloatingNearMe from '@/components/FloatingNearMe'
import MobileNav from '@/components/MobileNav'
import { FEATURED_TYPES, typeLabelPlural } from '@/lib/place-types'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from '@/lib/site'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  /**
   * Search Console and Bing Webmaster Tools verification. Set the token from
   * each console in the environment — without them there is no way to see
   * which queries the site ranks for, because search engines strip the query
   * from the referrer.
   */
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : {},
  },
  category: 'travel',
}

/**
 * Site-level JSON-LD. Emitted once in the root layout so every page carries the
 * publisher identity and the sitelinks search box Google looks for.
 */
const siteSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'en-US',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body className="font-sans antialiased">
        {/* Wraps everything: the header menu, the save buttons on every card
            and the sign-in popup all read the same session from here. */}
        <AuthProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/85 backdrop-blur-md">
          <nav
            aria-label="Primary"
            className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4"
          >
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900"
            >
              <TreePine className="h-5 w-5 text-green-700" strokeWidth={2.25} />
              {SITE_NAME}
            </Link>
            <div className="hidden items-center gap-x-6 text-sm font-medium text-gray-600 md:flex">
              {FEATURED_TYPES.map((type) => (
                <Link
                  key={type}
                  href={`/places/category/${type}`}
                  className="transition-colors hover:text-green-700"
                >
                  {typeLabelPlural(type)}
                </Link>
              ))}
              {/* Icon-only until there is room: with the label, the nav wraps to a
                  second row between the md and xl breakpoints. */}
              <Link
                href="/near-me"
                aria-label="Near me"
                title="Near me"
                className="flex items-center gap-1.5 transition-colors hover:text-green-700"
              >
                <LocateFixed className="h-4 w-4" />
                <span className="hidden xl:inline">Near me</span>
              </Link>
              <Link
                href="/search"
                className="flex items-center gap-1.5 rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800"
              >
                <Search className="h-4 w-4" />
                Search
              </Link>
              <UserMenu />
            </div>
            <MobileNav />
          </nav>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-gray-100 bg-gray-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-2 font-semibold text-gray-900">
                <TreePine className="h-4.5 w-4.5 text-green-700" strokeWidth={2.25} />
                {SITE_NAME}
              </p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
                {SITE_DESCRIPTION}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Browse</p>
              <ul className="mt-3 space-y-2.5 text-sm text-gray-600">
                {FEATURED_TYPES.map((type) => (
                  <li key={type}>
                    <Link href={`/places/category/${type}`} className="hover:text-green-700">
                      {typeLabelPlural(type)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Explore</p>
              <ul className="mt-3 space-y-2.5 text-sm text-gray-600">
                <li><Link href="/search" className="hover:text-green-700">Search</Link></li>
                <li><Link href="/places" className="hover:text-green-700">All categories</Link></li>
                <li><Link href="/cities" className="hover:text-green-700">All cities</Link></li>
                <li><a href={absoluteUrl('/sitemap.xml')} className="hover:text-green-700">Sitemap</a></li>
              </ul>
            </div>
          </div>
          <p className="border-t border-gray-200 px-6 py-6 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} {SITE_NAME}. Place data from Google Places.
          </p>
        </footer>

        <FloatingNearMe />
        <ClickTracker />
        <TidyUrl />
        </AuthProvider>
      </body>
    </html>
  )
}
