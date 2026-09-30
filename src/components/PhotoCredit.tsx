import type { Photo } from '@/lib/photos'

/**
 * The attribution a Creative Commons photo has to carry: who took it, under
 * which licence, and where the licence text lives.
 *
 * Plain text for Commons photos. The site does not link visitors off to other
 * domains, so nothing there is an anchor — including the licence, whose URI
 * CC BY requires us to state but not to make clickable. It is printed in full
 * so the requirement is still met and anyone can copy it out.
 *
 * Flickr photos are the one exception: Flickr's API terms require every
 * displayed photo to link back to its page on Flickr, so that credit is a link.
 */
export default function PhotoCredit({ photo }: { photo: Photo }) {
  const licenceUri = photo.licenseUrl?.replace(/^https?:\/\//, '')
  const fromFlickr = /(^|\.)flickr\.com$/.test(hostOf(photo.sourceUrl))
  const credit = `Photo: ${photo.author}, ${photo.license}${licenceUri ? ` (${licenceUri})` : ''}`

  if (fromFlickr) {
    return (
      <span>
        {credit}, via{' '}
        <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">
          Flickr
        </a>
      </span>
    )
  }
  return <span>{credit}, via Wikimedia Commons</span>
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}
