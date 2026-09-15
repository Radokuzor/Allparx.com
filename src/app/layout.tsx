import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { FEATURED_TYPES, typeLabelPlural } from '@/lib/place-types'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl } from '@/lib/site'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

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
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <header className="border-b border-gray-100">
          <nav
            aria-label="Primary"
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4"
          >
            <Link href="/" className="text-xl font-bold tracking-tight text-green-700">
              🌲 {SITE_NAME}
            </Link>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
              {FEATURED_TYPES.map((type) => (
                <Link
                  key={type}
                  href={`/places/category/${type}`}
                  className="transition-colors hover:text-green-700"
                >
                  {typeLabelPlural(type)}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="mt-20 border-t border-gray-100">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-gray-800">🌲 {SITE_NAME}</p>
              <p className="mt-2 text-sm text-gray-500">{SITE_DESCRIPTION}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Browse</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
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
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li><Link href="/places" className="hover:text-green-700">All categories</Link></li>
                <li><Link href="/cities" className="hover:text-green-700">All cities</Link></li>
                <li><a href={absoluteUrl('/sitemap.xml')} className="hover:text-green-700">Sitemap</a></li>
              </ul>
            </div>
          </div>
          <p className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} {SITE_NAME}. Place data from Google Places.
          </p>
        </footer>
      </body>
    </html>
  )
}
