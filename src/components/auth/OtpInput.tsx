'use client'

import { useEffect, useRef } from 'react'

/**
 * Six single-character cells that behave like one field.
 *
 * The fiddly parts, and why they are here: a pasted code has to fill every
 * cell rather than dropping six characters into the first; Backspace on an
 * empty cell has to step back, or correcting a typo means clicking; and mobile
 * keyboards only offer digits when both `inputMode` and `pattern` say so.
 */

const LENGTH = 6

type Props = {
  value: string
  onChange: (value: string) => void
  /** Fired once the last cell is filled, so nobody has to find a button. */
  onComplete: (value: string) => void
  disabled?: boolean
  invalid?: boolean
}

export default function OtpInput({ value, onChange, onComplete, disabled, invalid }: Props) {
  const cells = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    cells.current[0]?.focus()
  }, [])

  function commit(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, LENGTH)
    onChange(digits)
    if (digits.length === LENGTH) onComplete(digits)
    else cells.current[digits.length]?.focus()
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    // Typing into a filled cell replaces from that point rather than appending
    // at the end, which is what happens when someone corrects one character.
    commit(value.slice(0, index) + digits + value.slice(index + digits.length))
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1))
        cells.current[index]?.focus()
      } else if (index > 0) {
        onChange(value.slice(0, index - 1))
        cells.current[index - 1]?.focus()
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      cells.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      event.preventDefault()
      cells.current[index + 1]?.focus()
    }
  }

  return (
    <div
      className="flex justify-center gap-2"
      onPaste={(event) => {
        event.preventDefault()
        commit(event.clipboardData.getData('text'))
      }}
    >
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            cells.current[index] = element
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          // The browser and iOS both offer the code from the email here.
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={value[index] ?? ''}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          className={[
            'h-13 w-11 rounded-xl border text-center text-xl font-semibold text-gray-900',
            'transition-colors outline-none disabled:opacity-50',
            invalid
              ? 'border-red-300 bg-red-50 focus:border-red-500'
              : 'border-gray-200 bg-white focus:border-green-600 focus:ring-2 focus:ring-green-600/20',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
