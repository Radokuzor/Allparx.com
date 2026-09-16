export type Place = {
  slug: string
  name: string
  city: string
  state: string | null
  placeType: string
  googlePlaceId: string
  address: string
  lat: number | null
  lng: number | null
  rating: number | null
  reviewCount: number
  types: string[]
  website: string | null
  phone: string | null
  hours: string[]
  description: string | null
  goodForChildren: boolean | null
  allowsDogs: boolean | null
  hasRestroom: boolean | null
  parking: Record<string, boolean> | null
  photoReference: string | null
}
