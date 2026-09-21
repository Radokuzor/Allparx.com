'use client'

import type { ReactNode } from 'react'
import { rememberList, type BrowseItem } from '@/lib/browse-list'

/**
 * Wraps a server-rendered list of places so that opening one remembers the
 * whole list, letting the place page step through its neighbours.
 */
export default function RememberList({
  label,
  items,
  children,
}: {
  label: string
  items: BrowseItem[]
  children: ReactNode
}) {
  return (
    <div
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest('a[href^="/places/"]')
        if (link) rememberList(label, items)
      }}
    >
      {children}
    </div>
  )
}
