import type { Metadata } from 'next'
import SavedPlacesView from '@/components/SavedPlacesView'
import { VISITED } from '@/lib/lists'

export const metadata: Metadata = {
  title: 'My parks',
  robots: { index: false, follow: false },
}

export default function MyParksPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">My parks</h1>
      <p className="mt-2 text-gray-500">The places you have been.</p>
      <div className="mt-8">
        <SavedPlacesView
          list={VISITED}
          intro="Keep a record of the parks you have visited, and build up a map of where you have been."
          emptyLine="No visits recorded yet. Open any place and mark it as somewhere you have been."
        />
      </div>
    </div>
  )
}
