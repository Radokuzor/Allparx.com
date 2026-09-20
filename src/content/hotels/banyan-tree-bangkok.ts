import type { Hotel } from '@/lib/hotels'

/**
 * The city counterweight to Phuket: same brand, opposite format.
 *
 * Facts below the editorial line come from a Google Places Text Search run on
 * 2026-09-20. Nothing here is a review we wrote.
 */
const banyanTreeBangkok: Hotel = {
  slug: 'banyan-tree-bangkok',
  name: 'Banyan Tree Bangkok',
  brand: 'Banyan Tree',
  where: 'Sathorn, Bangkok',
  country: 'Thailand',
  tagline: 'A narrow tower on South Sathorn, with the roof bar the city knows it for.',

  googlePlaceId: 'ChIJP5u9pGCZ4jARukuKPYb6FeY',
  address: '21/100 South Sathon Road, Thung Maha Mek, Sathon, Bangkok 10120, Thailand',
  lat: 13.7236317,
  lng: 100.5397691,
  rating: 4.8,
  reviewCount: 16982,
  googleSummary:
    'Contemporary rooms & suites in a modern high-rise hotel featuring 6 eateries, 5 bar/lounges & a spa.',
  website: 'https://www.banyantree.com/thailand/bangkok',
  phone: '+66 2 679 1200',
  factsAsOf: '2026-09-20',

  lede: [
    'Banyan Tree Bangkok occupies the Thai Wah Tower on South Sathorn Road, in the business district south of Lumphini Park. It is the brand at its least resort-like: a vertical hotel in a dense city, where Phuket and Bintan are horizontal and walled off.',
    'The tower is unusually slim, which is why so many rooms are suites with a long window wall, and why the upper-floor views run clear across the city. The open-air levels at the top are the part most people have heard of, and the reason a lot of non-guests come through the lobby in the evening.',
    'It carries a 4.8 out of 5 on Google across 16,982 reviews — by a wide margin the largest review base of any property on this page, which is what you would expect of a long-established city hotel rather than a remote resort.',
  ],

  sections: [
    {
      heading: 'Where it sits',
      body: [
        'Sathorn is offices and embassies rather than sightseeing, which cuts both ways: quiet at night and well connected by road, but the temples and the river are a trip rather than a stroll. Lumphini Park is the nearest real green space, a short ride north.',
        'The BTS and MRT both serve the Sathorn/Silom area, and in Bangkok traffic the train is usually the faster way to anywhere central at the times you would want to travel.',
      ],
    },
    {
      heading: 'The rooftop, realistically',
      body: [
        'The open-air upper floors are the hotel’s signature and are open to non-guests, so they are busy, and they close or move indoors when the weather turns — this is a tropical city and the wet season is real. If a particular evening up there is the reason for the trip, it is worth a booking and a fallback.',
      ],
    },
  ],

  goodToKnow: [
    'A city tower, not a resort — expect a lobby and lifts, not buggies.',
    'Mostly suites, thanks to the unusually narrow floor plate.',
    'Open-air upper floors are popular with non-guests and weather-dependent.',
    'Sathorn is a business district; sightseeing is a ride away.',
  ],

  photos: [
    {
      caption: 'Thai Wah Tower on South Sathorn Road, which houses the hotel.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Thai_Wah_%26_Banyan_Tree_Bangkok_2021_%E0%B9%84%E0%B8%97%E0%B8%A2%E0%B8%A7%E0%B8%B2_%E0%B8%9A%E0%B8%B1%E0%B8%99%E0%B8%A2%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%B5_%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E.jpg/1280px-Thai_Wah_%26_Banyan_Tree_Bangkok_2021_%E0%B9%84%E0%B8%97%E0%B8%A2%E0%B8%A7%E0%B8%B2_%E0%B8%9A%E0%B8%B1%E0%B8%99%E0%B8%A2%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%B5_%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 2275,
        title: 'Thai Wah & Banyan Tree Bangkok 2021 ไทยวา บันยันทรี กรุงเทพ',
        author: 'Chainwit.',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Thai_Wah_%26_Banyan_Tree_Bangkok_2021_%E0%B9%84%E0%B8%97%E0%B8%A2%E0%B8%A7%E0%B8%B2_%E0%B8%9A%E0%B8%B1%E0%B8%99%E0%B8%A2%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%B5_%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E.jpg',
      },
    },
  ],

  updated: '2026-09-20',
}

export default banyanTreeBangkok
