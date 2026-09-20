import type { Photo } from '@/lib/photos'

/**
 * The attribution a Creative Commons photo has to carry: who took it, under
 * which licence, and a route back to the file it came from.
 *
 * Rendered inline, so it sits at the end of a caption or on a line of its own
 * without either layout needing to know about the other.
 *
 * `href` links the photographer's name to the Commons file page. Leave it off
 * where the picture itself already links there — one credit standing for a set
 * of photos has no single file to point at.
 */
export default function PhotoCredit({ photo, href }: { photo: Photo; href?: string }) {
  return (
    <span className="text-gray-400">
      Photo: {href ? <Outbound href={href}>{photo.author}</Outbound> : photo.author}
      {', '}
      {photo.licenseUrl ? (
        <Outbound href={photo.licenseUrl} license>
          {photo.license}
        </Outbound>
      ) : (
        photo.license
      )}
      , via Wikimedia Commons
    </span>
  )
}

function Outbound({
  href,
  license,
  children,
}: {
  href: string
  license?: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={license ? 'noopener noreferrer license' : 'noopener noreferrer'}
      className="underline decoration-gray-300 underline-offset-2 hover:text-green-700"
    >
      {children}
    </a>
  )
}
