import type { Hotel } from '@/lib/hotels'

/**
 * The short-hop resort: the one you reach from Singapore by ferry.
 *
 * Facts below the editorial line come from a Google Places Text Search run on
 * 2026-09-20. Nothing here is a review we wrote.
 */
const banyanTreeBintan: Hotel = {
  slug: 'banyan-tree-bintan',
  name: 'Banyan Tree Bintan',
  brand: 'Banyan Tree',
  where: 'Lagoi, Bintan Island',
  country: 'Indonesia',
  tagline: 'Villas on a granite headland, a ferry ride from Singapore.',

  googlePlaceId: 'ChIJfwJNpjHV2zERB98C2l-Waig',
  address:
    'Laguna Bintan Resort, Jalan Teluk Berembang, Sebong Lagoi, Kec. Teluk Sebong, Kabupaten Bintan, Kepulauan Riau 29155, Indonesia',
  lat: 1.1885137,
  lng: 104.3415087,
  rating: 4.8,
  reviewCount: 1190,
  googleSummary:
    'Plush quarters with private pools in a posh resort offering dining & bars, plus a spa & sea views.',
  website: 'https://www.banyantree.com/en/indonesia/bintan',
  phone: '+62 770 693100',
  factsAsOf: '2026-09-20',

  lede: [
    'Banyan Tree Bintan is built along a rocky headland on the north coast of Bintan, in Indonesia’s Riau Islands. The villas are set into the slope on stilts and boardwalks rather than laid out on flat ground, so most of them look down the coast over the South China Sea rather than across a lawn at each other.',
    'Its real distinction is how close it is to Singapore — the crossing is a ferry to Bintan Resorts and a short transfer, which makes it a weekend destination for a city an international flight away from every other resort on this page. Bintan keeps its own time zone offset from Singapore’s, which catches people out on the return sailing.',
    'Google reviewers rate it 4.8 out of 5 across 1,190 reviews. The site shares the wider Lagoi resort area with several other hotels and a golf course.',
  ],

  sections: [
    {
      heading: 'The headland, and what that means',
      body: [
        'Building along a granite ridge buys the views and costs the walking. Villas are reached by boardwalk and stair, and the ones with the best outlook are generally the ones furthest up. Buggies cover the distance, but if steps are a problem it is worth saying so when booking rather than on arrival.',
        'The beach below is a sheltered cove rather than a long strand, and the water is calmest in the northern hemisphere summer; the north-east monsoon around December to March brings wind and swell onto this coast.',
      ],
    },
    {
      heading: 'Getting there from Singapore',
      body: [
        'The standard route is a ferry from Singapore to Bandar Bentan Telani at Lagoi, then a short road transfer arranged by the resort. It is an international crossing, so passports and the usual entry formalities apply even though the journey is short.',
      ],
    },
  ],

  goodToKnow: [
    'Reached from Singapore by ferry plus a short transfer — passport needed.',
    'Villas are on a slope: boardwalks, steps and buggies.',
    'A sheltered cove rather than a long beach.',
    'December to March brings the monsoon wind onto this coast.',
  ],

  photos: [
    {
      caption: 'The boardwalk out over the granite boulders on the resort’s shoreline.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Banyan_Tree_Bintan.jpg/1280px-Banyan_Tree_Bintan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 853,
        title: 'Banyan Tree Bintan',
        author: 'Aimee Monteiro',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Banyan_Tree_Bintan.jpg',
      },
    },
    {
      caption: 'The same stretch of coast, looking out to the South China Sea.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Banyan_Tree_Bintan2.jpg/1280px-Banyan_Tree_Bintan2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 810,
        title: 'Banyan Tree Bintan2',
        author: 'Aimee Monteiro',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Banyan_Tree_Bintan2.jpg',
      },
    },
  ],

  updated: '2026-09-20',
}

export default banyanTreeBintan
