import type { Hotel } from '@/lib/hotels'

/**
 * The Hawai‘i entry, and the only one on the same road as the banyan tree.
 *
 * This is why the hotel section and the tree page belong to each other: the
 * resort is at 57-091 Kamehameha Hwy and the Kawela Bay banyan is at 57
 * Kamehameha Hwy, about a mile apart. Someone reading about the tree is
 * already standing in this resort's driveway.
 *
 * Facts below the editorial line come from a Google Places Text Search run on
 * 2026-09-20; the rebranding and sale are from trade press cited in the page
 * footer. Nothing here is a review we wrote.
 */
const ritzCarltonOahuTurtleBay: Hotel = {
  slug: 'ritz-carlton-oahu-turtle-bay',
  name: 'The Ritz-Carlton O‘ahu, Turtle Bay',
  brand: 'The Ritz-Carlton',
  where: 'Kahuku, O‘ahu',
  country: 'United States',
  tagline: 'The North Shore’s only large resort — and the banyan tree’s neighbour.',

  googlePlaceId: 'ChIJGWTp4U9QAHwR7Atcf4v26B4',
  address: '57-091 Kamehameha Hwy, Kahuku, HI 96731, United States',
  lat: 21.7046684,
  lng: -157.9979719,
  rating: 4.5,
  reviewCount: 9387,
  googleSummary:
    'Polished tropical resort offering 2 pools & 2 golf courses, plus 7 restaurants & bars.',
  website:
    'https://www.ritzcarlton.com/en/hotels/hnlkz-the-ritz-carlton-oahu-turtle-bay/overview/',
  phone: '+1 808-293-6000',
  factsAsOf: '2026-09-20',

  lede: [
    'This is the resort at the top of O‘ahu, on the point between Turtle Bay and Kawela Bay, and for most of its life it was simply Turtle Bay Resort. It rebranded as The Ritz-Carlton O‘ahu, Turtle Bay on 31 July 2024, after Host Hotels & Resorts bought the 450-room property and surrounding land from Blackstone and handed management to Marriott. A full renovation had been completed the year before.',
    'What has not changed is the position, which is the whole argument for staying here. The North Shore has almost no hotels — it is a coast of rented houses and day-trippers from Honolulu — so this is the one place you can stay on it at resort scale. Everything the drive up here is famous for is then a short trip rather than an hour each way.',
    'Google reviewers rate it 4.5 out of 5 across 9,387 reviews.',
  ],

  sections: [
    {
      heading: 'The banyan tree is next door',
      body: [
        'The Kawela Bay banyan — the tree from Lost, and the reason many people arrive on this stretch of coast — sits about a mile west along Kamehameha Highway, at number 57 to the resort’s 57-091. The walk to it goes through ironwood forest from an unmarked break in the treeline, and takes about five minutes from the road.',
        'The bay beyond the tree is the calm one. Turtle Bay’s own beaches are on the exposed point, which is spectacular and, in winter, not for casual swimming.',
      ],
    },
    {
      heading: 'Winter and summer are different resorts',
      body: [
        'From roughly November to February the North Shore surf is enormous, which is why the professional tour comes here. That is a remarkable thing to watch from a few miles away and a genuine hazard to swim in; the sheltered coves and the pools are where people actually get in the water.',
        'In summer the same coast goes flat and turns into snorkelling. If the plan involves the sea rather than looking at it, the season matters more here than the hotel does.',
      ],
    },
  ],

  goodToKnow: [
    'The Kawela Bay banyan tree is about a mile west along the same highway.',
    'Renamed from Turtle Bay Resort in July 2024; photos below predate that.',
    'Winter surf is huge and dangerous; summer is the swimming season.',
    'About an hour and a quarter from Honolulu, traffic depending.',
  ],

  photos: [
    {
      caption: 'The view from the resort’s lawn out to the North Shore surf.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Turtle_Bay_Resort%2C_Oahu%2C_Hawaii.jpg/1280px-Turtle_Bay_Resort%2C_Oahu%2C_Hawaii.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 960,
        title: 'Turtle Bay Resort, Oahu, Hawaii',
        author: 'Waydeo',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Turtle_Bay_Resort,_Oahu,_Hawaii.jpg',
      },
    },
    {
      caption: 'The pool at dusk, photographed under the resort’s former name.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Turtle_Bay_Resort_pool_%285712058281%29.jpg/1280px-Turtle_Bay_Resort_pool_%285712058281%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 960,
        title: 'Turtle Bay Resort pool (5712058281)',
        author: 'Simon_sees from Australia',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Turtle_Bay_Resort_pool_(5712058281).jpg',
      },
    },
    {
      caption: 'The main building lit at nightfall, with its turtle mural.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Turtle_Bay_Resort_%286815669789%29.jpg/1280px-Turtle_Bay_Resort_%286815669789%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 960,
        title: 'Turtle Bay Resort (6815669789)',
        author: 'Simon_sees from Australia',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Turtle_Bay_Resort_(6815669789).jpg',
      },
    },
    {
      caption: 'The point at sunset, looking back at the resort.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Turtle_Bay_Resort_evening_%283971018730%29.jpg/1280px-Turtle_Bay_Resort_evening_%283971018730%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 960,
        title: 'Turtle Bay Resort evening (3971018730)',
        author: 'Simon_sees from Australia',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Turtle_Bay_Resort_evening_(3971018730).jpg',
      },
    },
  ],

  updated: '2026-09-20',
}

export default ritzCarltonOahuTurtleBay
