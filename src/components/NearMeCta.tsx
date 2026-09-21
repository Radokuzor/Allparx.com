'use client'

import Link from 'next/link'
import { LocateFixed } from 'lucide-react'
import { track, type NearMeSource } from '@/lib/track-event'
import { cn } from '@/lib/utils'

/**
 * The "Find near me" call to action. One component for the hero and the
 * floating button so they look identical and both report their clicks —
 * `source` is what lets the analytics dashboard compare them.
 */
export default function NearMeCta({
  source,
  className,
}: {
  source: NearMeSource
  className?: string
}) {
  return (
    <Link
      href="/near-me"
      data-track={`Find near me (${source})`}
      onClick={() => track({ type: 'near_me_click', source, path: window.location.pathname })}
      className={cn(
        'group relative flex shrink-0 overflow-hidden rounded-full p-0.5 shadow-[0_0_28px_rgba(163,230,53,0.45)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(163,230,53,0.75)]',
        className,
      )}
    >
      {/* Bright lime ring, with a highlight that keeps circling it */}
      <span className="absolute inset-0 rounded-full bg-lime-400" />
      <span className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_55%,#fde047_85%,#ffffff_100%)] motion-reduce:animate-none" />
      <span className="relative flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-green-800 to-green-950 px-6 py-3 text-sm font-bold text-white">
        <LocateFixed className="h-4.5 w-4.5 text-lime-300" />
        Find near me
        <span
          aria-hidden
          className="text-lime-300 transition-transform duration-300 group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  )
}
