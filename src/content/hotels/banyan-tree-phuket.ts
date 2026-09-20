import type { Hotel } from '@/lib/hotels'

/**
 * The brand's first resort, and the anchor of /places/banyan-tree.
 *
 * Facts below the editorial line come from a Google Places Text Search run on
 * 2026-09-20; the founding history is from the group's own corporate record
 * (see `sources` in the page footer). Nothing here is a review we wrote.
 */
const banyanTreePhuket: Hotel = {
  slug: 'banyan-tree-phuket',
  name: 'Banyan Tree Phuket',
  brand: 'Banyan Tree',
  where: 'Bang Tao Beach, Phuket',
  country: 'Thailand',
  tagline: 'The resort the brand started with, on a rehabilitated tin mine.',

  googlePlaceId: 'ChIJRd3GhzE4UDARzv-XHqvAepo',
  address:
    '33 Srisunthorn 33/27 Cherngthalay Bang Tao Beach, Tambon Choeng Thale, Amphoe Thalang, Phuket 83110, Thailand',
  lat: 8.0120586,
  lng: 98.295648,
  rating: 4.8,
  reviewCount: 4588,
  googleSummary:
    "High-end property offering posh villas with private pools, plus 5 restaurants, a kids' club & a spa.",
  website: 'https://www.banyantree.com/thailand/phuket',
  phone: '+66 76 372 400',
  factsAsOf: '2026-09-20',

  lede: [
    'Banyan Tree Phuket is where the company began. Ho Kwon Ping and Claire Chiang bought the land at Bang Tao Bay on the island’s west coast, and the first resort opened there in 1994 — the property that every other Banyan Tree has been measured against since.',
    'The site had been an abandoned tin mine, written off as too damaged to build on. What is now a lagoon system threaded between pool villas was the mine workings; the planting that screens each villa from the next was put there deliberately, over years. It is the part of the story the brand tells most often, and unusually for resort marketing, it is checkable — the rehabilitation is why the lagoon is the shape it is.',
    'Google reviewers rate it 4.8 out of 5 across 4,588 reviews. The layout is villas rather than rooms: each one walled, most with a private pool, which is the format Banyan Tree exported to every property that followed.',
  ],

  sections: [
    {
      heading: 'What the layout is actually like',
      body: [
        'The resort is low-rise and spread out, arranged around water rather than along a beach front. Villas sit in their own walled gardens, which is the main thing guests are paying for: you can use the pool without seeing anybody. The trade-off is distance — it is a long site, and getting to dinner means a buggy or a bicycle rather than a short walk.',
        'Bang Tao beach itself is a separate short trip from most villas, reached through the wider Laguna Phuket complex that Banyan Tree shares with several other hotels. If a room that opens straight onto sand is the priority, this is not that resort.',
      ],
    },
    {
      heading: 'Getting there',
      body: [
        'Phuket International Airport is the arrival point, roughly half an hour north of Bang Tao by road. The resort sits at the northern end of the island’s west coast, well clear of Patong — which is the point for most people who choose it, and a drawback if you want nightlife within walking distance.',
      ],
    },
  ],

  goodToKnow: [
    'Villas, not rooms — most have a private pool and a walled garden.',
    'The site is large; buggies and bicycles do the moving around.',
    'The beach is a short trip from most villas, not a step outside them.',
    'About 30 minutes by road from Phuket International Airport.',
  ],

  photos: [
    {
      caption: 'A pool villa on the resort’s lagoon, the flooded workings of the old tin mine.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Banyan_Tree_Phuket_Thailand.jpg/1280px-Banyan_Tree_Phuket_Thailand.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 853,
        title: 'Banyan Tree Phuket Thailand',
        author: 'BanyanTreeGroup',
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Banyan_Tree_Phuket_Thailand.jpg',
      },
    },
    {
      caption: 'One of the resort pools, shot as a panorama.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Piscina_Banyon_Tree_Phuket_-_panoramio.jpg/1280px-Piscina_Banyon_Tree_Phuket_-_panoramio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 314,
        title: 'Piscina Banyon Tree Phuket - panoramio',
        author: 'F.J.OGALLAR',
        license: 'CC BY-SA 3.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Piscina_Banyon_Tree_Phuket_-_panoramio.jpg',
      },
    },
  ],

  updated: '2026-09-20',
}

export default banyanTreePhuket
