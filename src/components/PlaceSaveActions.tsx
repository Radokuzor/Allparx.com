'use client'

import { Check, Heart } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { VISITED, WISHLIST } from '@/lib/lists'
import { cn } from '@/lib/utils'

/**
 * The pair of buttons under a place's title: one for somewhere you want to go,
 * one for somewhere you have been.
 *
 * They sit on the photo, so the resting state is translucent white on the
 * darkened hero and the active state is solid — legible over whatever the
 * photo happens to be behind it.
 */
export default function PlaceSaveActions({ slug, name }: { slug: string; name: string }) {
  const { toggleSave, isSaved, status } = useAuth()
  const signedIn = status === 'signed-in'
  const wanted = signedIn && isSaved(slug, WISHLIST)
  const visited = signedIn && isSaved(slug, VISITED)

  const base =
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors'

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        data-track={wanted ? 'Remove from want-to-go list' : 'Add to want-to-go list'}
        onClick={() => void toggleSave(slug, WISHLIST)}
        aria-pressed={wanted}
        aria-label={wanted ? `Remove ${name} from your list` : `Save ${name} to your list`}
        className={cn(
          base,
          wanted ? 'bg-white text-green-800' : 'bg-white/15 text-white hover:bg-white/25',
        )}
      >
        <Heart className={cn('h-4 w-4', wanted && 'fill-red-500 text-red-500')} />
        {wanted ? 'Saved' : 'Save'}
      </button>

      <button
        type="button"
        data-track={visited ? 'Unmark as visited' : 'Mark as visited'}
        onClick={() => void toggleSave(slug, VISITED)}
        aria-pressed={visited}
        aria-label={visited ? `Remove ${name} from your parks` : `Mark ${name} as visited`}
        className={cn(
          base,
          visited ? 'bg-white text-green-800' : 'bg-white/15 text-white hover:bg-white/25',
        )}
      >
        <Check className="h-4 w-4" />
        {visited ? 'Been here' : 'I have been here'}
      </button>
    </div>
  )
}
