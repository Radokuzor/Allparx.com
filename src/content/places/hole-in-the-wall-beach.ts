import type { PlaceEditorial } from '@/lib/place-editorial'

/**
 * /places/hole-in-the-wall-beach — East Lyme's town beach in Niantic,
 * Connecticut, reached through a tunnel under the Shore Line railroad.
 *
 * Google's listing says dogs are allowed and lists no restrooms. The town
 * bans dogs from the beach all summer and from the boardwalk all year, and
 * there is a restroom building — hence `facts`. Dogs are set to null rather
 * than false because off-season they genuinely are allowed on the sand; the
 * FAQ below spells out the dates.
 */
const holeInTheWallBeach: PlaceEditorial = {
  displayName: 'Hole-in-the-Wall Beach',

  metaDescription:
    'Hole-in-the-Wall Beach in Niantic, CT: a lifeguarded town beach reached through a tunnel under the railroad, at the end of the Niantic Bay Boardwalk. Passes, hours, dog rules.',

  lede: [
    'Hole-in-the-Wall is East Lyme’s town beach in Niantic, a short curve of pale sand on Niantic Bay a couple of minutes’ walk from the shops and restaurants of Main Street. The name is literal: the only way onto the sand is a short pedestrian tunnel cut through the embankment that carries the railroad along the water.',
    'A jetty keeps the swimming area calm, which makes it a favourite with families, and lifeguards cover the designated swim area in season. It is also the western end of the Niantic Bay Boardwalk, so the beach doubles as the start of one of the best easy walks on the Connecticut shoreline. Google reviewers give it 4.6 out of 5 across more than a thousand reviews.',
  ],

  sections: [
    {
      heading: 'Parking and passes',
      body: [
        'The beach lot is on Baptist Lane, off Main Street (Route 156). From Memorial Day to Labor Day a beach pass is required, sold at the beach by the day, with higher rates for non-residents and at weekends. Outside the summer season, parking is free, and the lot also serves the boardwalk year-round.',
        'On hot summer weekends the lot fills early; Cini Memorial Park, at the boardwalk’s eastern end, is the other place to park and walk in.',
      ],
    },
    {
      heading: 'On the beach',
      body: [
        'The beach is open from 8 a.m. to 8:30 p.m. There are restrooms, an outdoor shower tower and a bicycle repair stand, and beach wheelchairs (Mobi-Chairs) are available on request.',
        'The town keeps a tidy list of rules: no alcohol or tobacco, no ball games or frisbees in the swim area, and only Coast Guard–approved flotation devices. Masks and fins are fine, snorkels are not. And don’t feed the gulls — they need no encouragement.',
      ],
    },
    {
      heading: 'The Niantic Bay Boardwalk',
      body: [
        'From the beach the boardwalk runs about a mile east along the water to Cini Memorial Park, with benches, a fishing pier and open views across Niantic Bay to Long Island Sound. It is free, open around the clock, flat and fully accessible — good for a sunset walk even when the beach is closed.',
        'The boardwalk has its own rules: no bikes, skateboards or scooters, and no dogs at any time of year (service animals excepted).',
      ],
    },
  ],

  faqs: [
    {
      question: 'Are dogs allowed at Hole-in-the-Wall Beach?',
      answer:
        'Not in summer. Dogs are banned from the beach from Memorial Day through Labor Day, and allowed under control the rest of the year. They are never allowed on the Niantic Bay Boardwalk, except service animals.',
    },
    {
      question: 'Do you have to pay to park at Hole-in-the-Wall Beach?',
      answer:
        'From Memorial Day to Labor Day a beach pass is required, sold at the beach by the day; residents pay less than non-residents. Parking is free the rest of the year.',
    },
    {
      question: 'Why is it called Hole-in-the-Wall?',
      answer:
        'You reach the sand through a short tunnel under the railroad embankment that runs along the shore, so you literally walk through a hole in the wall.',
    },
    {
      question: 'Are there lifeguards at Hole-in-the-Wall Beach?',
      answer:
        'Yes, in season, covering the designated swim area only. When they are off duty you swim at your own risk.',
    },
  ],

  facts: { allowsDogs: null, hasRestroom: true },

  sources: [
    {
      label: 'Town of East Lyme — Hole-in-the-Wall Beach',
      url: 'https://eltownhall.com/government/departments/parks-recreation/parks/hole-in-the-wall-beach/',
    },
    {
      label: 'Connecticut Trail Finder — Niantic Bay Boardwalk',
      url: 'https://www.cttrailfinder.com/trails/trail/niantic-bay-boardwalk',
    },
  ],

  updated: '2026-09-30',
}

export default holeInTheWallBeach
