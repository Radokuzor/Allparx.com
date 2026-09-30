import type { PlaceEditorial } from '@/lib/place-editorial'

/**
 * /places/klahhane-ridge-trail — the ridge above Hurricane Ridge in Olympic
 * National Park, usually climbed by the Switchback Trail.
 *
 * Google flags this listing as dog-friendly. Olympic National Park bans pets
 * from every trail but a short list that doesn't include this one, so `facts`
 * corrects it — otherwise the page, and the dog-friendly guides, would send
 * people up with a dog they'd be turned back with.
 */
const klahhaneRidge: PlaceEditorial = {
  metaDescription:
    'Klahhane Ridge in Olympic National Park: the steep Switchback Trail climbs 1,500 ft in 1.5 miles to 360° views. Distances, parking, pass, dogs and mountain goats.',

  lede: [
    'Klahhane Ridge is the rocky spine that rises behind Hurricane Ridge in Olympic National Park, high above Port Angeles. From the top you look north across the Strait of Juan de Fuca and south into the interior of the Olympic Mountains — one of the best views in the park for the effort it takes.',
    'That effort is real, though short. The usual way up, the Switchback Trail, gains about 1,500 feet in a mile and a half, most of it in tight zigzags through subalpine forest before breaking out onto open meadow and ridge. Google reviewers give it 4.9 out of 5, and plenty of them mention their legs.',
  ],

  sections: [
    {
      heading: 'The routes',
      body: [
        'The Switchback Trail is the shortest and most direct approach. Its small parking area is on the right side of Hurricane Ridge Road about 14.8 miles from the Race Street junction in Port Angeles, a couple of miles below the Hurricane Ridge visitor area. It is about 1.5 miles and 1,500 feet of climbing to the ridge; continuing to the knoll at roughly 6,050 feet makes it around 5 miles round trip with 1,700 feet of gain. Allow two and a half to three hours.',
        'Longer approaches reach the same ridge from other directions, including a much bigger day from the Heart O’ the Hills area past Lake Angeles. For a first visit, the Switchback Trail is the one to pick.',
      ],
    },
    {
      heading: 'What to expect up top',
      body: [
        'Above the trees the trail is fully exposed, so bring sun protection and more water than the distance suggests. Beyond the first viewpoint a narrow section of trail is cut into rock across steep slopes and ledges — sure-footed hikers find it fine, but it is no place for anyone uneasy with drop-offs.',
        'Mountain goats frequent the ridge, along with marmots, deer and the occasional black bear. Give the goats plenty of room and never feed them or let them approach you.',
        'Midsummer brings wildflowers — paintbrush, lupine, glacier lilies — and the biggest crowds. On holiday weekends the Hurricane Ridge road can back up for one to three hours at the entrance, so start early.',
      ],
    },
    {
      heading: 'Pass, dogs and conditions',
      body: [
        'You need an Olympic National Park entrance pass or an America the Beautiful pass to drive Hurricane Ridge Road. Dogs are not allowed on this trail: the park permits pets on only a handful of low-elevation trails, and none of them are at Hurricane Ridge. Leashed pets can stay in parking areas and on roads.',
        'Hurricane Ridge’s historic day lodge burned in 2023 and the area reopened with reduced facilities. Snow can linger on the ridge into early summer and returns in autumn, so check the park’s current road and trail conditions before driving up.',
      ],
    },
  ],

  faqs: [
    {
      question: 'Are dogs allowed on the Klahhane Ridge Trail?',
      answer:
        'No. Olympic National Park allows pets on only a few specific trails, and Klahhane Ridge is not one of them. Service animals are the exception.',
    },
    {
      question: 'How long is the hike to Klahhane Ridge?',
      answer:
        'By the Switchback Trail it is about 1.5 miles and 1,500 feet of gain to the ridge, or around 5 miles round trip with 1,700 feet of gain to the 6,050-foot knoll. Most people take two and a half to three hours.',
    },
    {
      question: 'Where do you park for Klahhane Ridge?',
      answer:
        'The Switchback Trail lot is on the right side of Hurricane Ridge Road, about 14.8 miles from Race Street in Port Angeles. It is small and fills early in summer.',
    },
    {
      question: 'Do you need a pass to hike Klahhane Ridge?',
      answer:
        'Yes — an Olympic National Park entrance pass or an America the Beautiful interagency pass covers the drive up Hurricane Ridge Road.',
    },
  ],

  facts: { allowsDogs: false },

  sources: [
    { label: 'Washington Trails Association — Klahhane Ridge', url: 'https://www.wta.org/go-hiking/hikes/klahhane-ridge' },
    { label: 'Olympic National Park — Pets', url: 'https://www.nps.gov/olym/planyourvisit/pets.htm' },
    {
      label: 'Olympic National Park — Hurricane Ridge reopening',
      url: 'https://www.nps.gov/olym/learn/news/hurricane-ridge-area-will-reopen-june-27-after-fire.htm',
    },
  ],

  updated: '2026-09-30',
}

export default klahhaneRidge
