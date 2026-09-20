import type { Metadata } from 'next'
import SavedPlacesView from '@/components/SavedPlacesView'
import { WISHLIST } from '@/lib/lists'

/**
 * Someone's own list. Kept out of the index — there is nothing here for a
 * search engine, and the page is empty without a session anyway.
 */
export const metadata: Metadata = {
  title: 'Saved places',
  robots: { index: false, follow: false },
}

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Saved places</h1>
      <p className="mt-2 text-gray-500">Everywhere you want to go.</p>
      <div className="mt-8">
        <SavedPlacesView
          list={WISHLIST}
          intro="Save parks, trails and gardens as you find them, and they will be here on every device you use."
          emptyLine="Nothing saved yet. Tap the heart on any place to keep it here."
        />
      </div>
    </div>
  )
}
