import { ImageResponse } from 'next/og'
import { BrandIcon } from '@/lib/brand-icon'

export const size = { width: 48, height: 48 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<BrandIcon size={size.width} radius={10} />, size)
}
