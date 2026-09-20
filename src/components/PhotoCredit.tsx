import type { Photo } from '@/lib/photos'

/**
 * The attribution a Creative Commons photo has to carry: who took it, under
 * which licence, and where the licence text lives.
 *
 * Deliberately plain text. The site does not link visitors off to other
 * domains, so nothing here is an anchor — including the licence, whose URI CC BY
 * requires us to state but not to make clickable. It is printed in full so the
 * requirement is still met and anyone can copy it out.
 */
export default function PhotoCredit({ photo }: { photo: Photo }) {
  const licenceUri = photo.licenseUrl?.replace(/^https?:\/\//, '')
  return (
    <span>
      Photo: {photo.author}, {photo.license}
      {licenceUri ? ` (${licenceUri})` : ''}, via Wikimedia Commons
    </span>
  )
}
