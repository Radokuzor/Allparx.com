'use client'

import { Heart } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { WISHLIST } from '@/lib/lists'
import { cn } from '@/lib/utils'

/**
 * The save control, in two shapes: a bare heart that sits on a card's photo,
 * and a labelled button for a place page.
 *
 * On a card the whole tile is a link, so the click has to be stopped here or
 * saving a place would navigate away from the grid.
 *
 * While the session is still loading the heart renders empty rather than
 * hidden. A control that appears a moment after the page does is worse than
 * one that fills in a moment later, because it moves everything around it.
 */

type Props = {
  slug: string
  name: string
  variant?: 'card' | 'page'
  list?: string
  className?: string
}

export default function SaveButton({ slug, name, variant = 'card', list = WISHLIST, className }: Props) {
  const { toggleSave, isSaved, status } = useAuth()
  const saved = status === 'signed-in' && isSaved(slug, list)

  function handleClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    void toggleSave(slug, list)
  }

  const label = saved ? `Remove ${name} from your list` : `Save ${name} to your list`

  if (variant === 'page') {
    return (
      <button
        type="button"
        data-track={saved ? 'Unsave place (page)' : 'Save place (page)'}
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
          saved
            ? 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
            : 'border-gray-200 bg-white text-gray-700 hover:border-green-200 hover:text-green-700',
          className,
        )}
      >
        <Heart className={cn('h-4 w-4', saved && 'fill-green-700 text-green-700')} />
        {saved ? 'Saved' : 'Save'}
      </button>
    )
  }

  return (
    <button
      type="button"
      data-track={saved ? 'Unsave place (card)' : 'Save place (card)'}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-white',
        className,
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          saved ? 'fill-red-500 text-red-500' : 'text-gray-600',
        )}
      />
    </button>
  )
}
