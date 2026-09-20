'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import NearMeCta from './NearMeCta'

/** Pages where the button would be redundant (or, for the dashboard, noise). */
const HIDDEN_ON = ['/near-me', '/analytics']

/** The home hero has its own copy of the button; wait until it has scrolled away. */
const HOME_REVEAL_AT = 520

/**
 * "Find near me", pinned to the bottom-right of every page so the most useful
 * thing the site does is always one tap away.
 */
export default function FloatingNearMe() {
  const pathname = usePathname()
  const onHome = pathname === '/'
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    if (!onHome) return
    const onScroll = () => setPastHero(window.scrollY > HOME_REVEAL_AT)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onHome])

  if (HIDDEN_ON.some((prefix) => pathname.startsWith(prefix))) return null
  if (onHome && !pastHero) return null

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden sm:right-6">
      <NearMeCta source="floating" />
    </div>
  )
}
