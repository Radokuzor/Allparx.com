import { ImageResponse } from 'next/og'
import { BrandIcon } from '@/lib/brand-icon'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// iOS rounds the corners itself, so this one is a full-bleed square.
export default function AppleIcon() {
  return new ImageResponse(<BrandIcon size={size.width} radius={0} />, size)
}
