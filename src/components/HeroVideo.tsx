const VIDEO = '/videos/hero.mp4'
const POSTER = '/videos/hero-poster.jpg'

/**
 * The looping video behind the homepage hero. Sits at the back of a `relative
 * isolate` parent and fills it; the parent's content layers on top.
 *
 * The clip is a 9-second seamless loop (the tail crossfades into the head, so
 * the wrap-around has no cut), 720p and about 1.7 MB — a background has to be
 * cheap, since it competes with the page for the same connection.
 *
 * Two things keep it well-behaved:
 * - The poster is also painted as the wrapper's own background, so visitors who
 *   ask their OS for reduced motion (the video is hidden for them) still get a
 *   photograph rather than a flat colour, and nothing autoplays.
 * - `muted` and `playsInline` are what browsers require before they will
 *   autoplay at all, iOS Safari especially.
 *
 * Purely decorative, so it is hidden from assistive tech.
 */
export default function HeroVideo() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 overflow-hidden bg-green-950 bg-cover bg-center"
      style={{ backgroundImage: `url(${POSTER})` }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        poster={POSTER}
        className="h-full w-full object-cover motion-reduce:hidden"
      >
        <source src={VIDEO} type="video/mp4" />
      </video>

      {/* Footage is busy right where the headline sits, so it is darkened
          evenly, with extra weight top and bottom to meet the header and the
          page below. The green tint keeps it in the site's palette. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-green-950/35 to-black/65" />
    </div>
  )
}
