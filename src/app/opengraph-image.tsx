import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/site'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = `${SITE_NAME} — Find Your Next Outdoor Adventure`

// Satori (the renderer behind ImageResponse) needs an explicit `display` on any
// element with more than one child, so every node here sets it.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #166534 0%, #34d399 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 40, opacity: 0.85 }}>{`🌲 ${SITE_NAME}`}</div>
        <div
          style={{
            display: 'flex',
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.1,
            marginTop: 24,
          }}
        >
          Find Your Next Outdoor Adventure
        </div>
        <div style={{ display: 'flex', fontSize: 32, opacity: 0.8, marginTop: 24 }}>
          Parks · Trails · Dog Parks · Beaches · Campgrounds
        </div>
      </div>
    ),
    size,
  )
}
