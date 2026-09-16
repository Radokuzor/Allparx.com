'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SearchBox({
  defaultValue = '',
  autoFocus = false,
}: {
  defaultValue?: string
  autoFocus?: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const q = value.trim()
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
      }}
      className="flex w-full gap-2"
    >
      <input
        type="search"
        name="q"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search parks, trails, beaches or a city…"
        aria-label="Search places"
        className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-base text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-green-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-800"
      >
        Search
      </button>
    </form>
  )
}
