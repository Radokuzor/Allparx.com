// The AllParx mark: the same lucide TreePine used in the site header, white on
// the brand green. Shared by the generated favicon, Apple touch icon and the
// script that builds favicon.ico so they never drift apart.
//
// Rendered by Satori (next/og), so every node sets `display` explicitly.

export const BRAND_GREEN = '#15803d'

export function BrandIcon({ size, radius }: { size: number; radius: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND_GREEN,
        borderRadius: radius,
      }}
    >
      <svg
        width={Math.round(size * 0.78)}
        height={Math.round(size * 0.78)}
        viewBox="2 2 20 21"
        fill="white"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z" />
        <path d="M12 22v-3" />
      </svg>
    </div>
  )
}
