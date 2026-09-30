import type { PlaceEditorial } from '@/lib/place-editorial'

/**
 * /places/spadra-park — the Corps of Engineers park and campground on Lake
 * Dardanelle, just south of Clarksville, Arkansas.
 *
 * The single most-visited place page from search (see the 2026-09-30
 * analytics pull). Visitors arrive on phones, mostly campers checking the
 * sites and the boat ramps before a trip, so the page answers that first and
 * leaves the history — which is the reason the site is on a National Historic
 * Trail — for further down.
 */
const spadraPark: PlaceEditorial = {
  metaDescription:
    'Spadra Park on Lake Dardanelle near Clarksville, AR: a Corps of Engineers campground with electric sites, two boat ramps, a marina and a Trail of Tears history.',

  lede: [
    'Spadra Park sits on the Arkansas River where it widens into Lake Dardanelle, a short drive south of downtown Clarksville. It is run by the U.S. Army Corps of Engineers, and it does three jobs at once: a small riverside campground, a launch point for boats heading out onto the lake, and a stop on the Trail of Tears National Historic Trail.',
    'The campground is compact — 29 sites, 24 of them with electric hookups — with paved back-in pads long enough for big rigs, two boat ramps and a marina next door. Google reviewers rate it 4.6 out of 5 across nearly 200 reviews, and the comments come back to the same things: level sites, clean bathhouses and the view across the water at sunset.',
  ],

  sections: [
    {
      heading: 'Camping at Spadra',
      body: [
        'Most sites have 30-amp electric service and many add a water connection. The pads are paved back-ins; Recreation.gov lists the longest at 65 feet, so large fifth wheels and motorhomes fit without the usual squeeze. Tents are welcome on the same sites. There is a dump station with fresh water, flush-toilet restrooms and individual shower rooms, plus a playground and a group picnic shelter that can be reserved.',
        'Sites are booked through Recreation.gov, where the reservation season runs from March through October. The park itself stays open year-round, so a winter visit is possible — expect fewer neighbours and fewer services. Check-in is from 4 p.m.',
      ],
    },
    {
      heading: 'On the water',
      body: [
        'Lake Dardanelle is a 34,300-acre reservoir on the Arkansas River, known across the region for largemouth bass, crappie and catfish; it hosts bass tournaments through much of the year. Spadra’s two ramps put you straight onto it, and the adjacent Spadra Marina covers last-minute boating and fishing needs.',
        'Even if you never launch a boat, the bank here is good for an evening with a rod. The river is a working waterway, so give the navigation channel and passing barge traffic a wide berth.',
      ],
    },
    {
      heading: 'A Trail of Tears landing',
      body: [
        'Long before the lake, this was the river town of Spadra. The federal government opened a trading post here around 1819, and the settlement served as the first seat of Johnson County until Clarksville took the title in the early 1830s — in part, local history says, because Spadra flooded too often.',
        'In the 1830s Spadra was a steamboat landing on the water route of the Trail of Tears, and the National Park Service counts the park as a site on the Trail of Tears National Historic Trail. Wayside panels overlooking the river tell that story. Later the town turned to coal: the Spadra field, discovered in 1840, made mining Johnson County’s leading industry by the 1880s. Little of the town survives, but the marina and park occupy roughly where it stood.',
      ],
    },
  ],

  faqs: [
    {
      question: 'How many campsites does Spadra Park have?',
      answer:
        'Spadra has 29 campsites, 24 of them with electric hookups (mostly 30-amp, many with water). Sites are paved back-ins up to about 65 feet and are reserved through Recreation.gov.',
    },
    {
      question: 'Is Spadra Park open all year?',
      answer:
        'The park is open year-round. Campsite reservations run from March through October, so check Recreation.gov for what is bookable outside that window.',
    },
    {
      question: 'Can you launch a boat at Spadra Park?',
      answer:
        'Yes. There are two boat ramps onto Lake Dardanelle, with Spadra Marina right next door.',
    },
    {
      question: 'What is the history of Spadra?',
      answer:
        'Spadra was a river town with a federal trading post from about 1819 and the first seat of Johnson County. It was a steamboat landing on the Trail of Tears water route, and the park is now a site on the Trail of Tears National Historic Trail.',
    },
  ],

  sources: [
    { label: 'U.S. National Park Service — Spadra Park (ACE)', url: 'https://www.nps.gov/places/spadra-park-ace.htm' },
    { label: 'Recreation.gov — Spadra', url: 'https://www.recreation.gov/camping/campsites/10054670' },
    {
      label: 'CALS Encyclopedia of Arkansas — Spadra (Johnson County)',
      url: 'https://encyclopediaofarkansas.net/entries/spadra-johnson-county-3510/',
    },
  ],

  updated: '2026-09-30',
}

export default spadraPark
