import type { PlaceEditorial } from '@/lib/place-editorial'

/**
 * /places/stanley-canyon-reservoir-trailhead — Trail 707 up Stanley Canyon to
 * the reservoir, starting inside the U.S. Air Force Academy near Colorado
 * Springs.
 *
 * The trailhead is on the Academy, and since 1 March 2026 the Academy has
 * required a sponsored pass for anyone without a Defense Department ID. That
 * is the first thing someone planning this hike needs to know, so it leads
 * the page. Re-check the Academy's access rules whenever this is reviewed.
 */
const stanleyCanyon: PlaceEditorial = {
  displayName: 'Stanley Canyon Trail & Reservoir',

  metaDescription:
    'Stanley Canyon Trail 707 climbs from the Air Force Academy to a mountain reservoir near Colorado Springs. Read the 2026 base-access rules before you go, plus distance and gain.',

  lede: [
    'Stanley Canyon is one of the steepest short hikes on the Colorado Springs side of the Front Range: Trail 707 climbs out of a narrow canyon above the U.S. Air Force Academy to Stanley Canyon Reservoir, a mountain lake about two miles in. Google reviewers rate it 4.6 out of 5.',
    'Before anything else, though: the trailhead is inside the Academy. Since March 1, 2026 the Academy has required every visitor without a Defense Department ID card to hold a sponsored pass, and it has suspended the Trusted Traveler program that used to let civilians drive in. Without a sponsor, you will be turned away at the gate.',
  ],

  sections: [
    {
      heading: 'Getting to the trailhead',
      body: [
        'The trailhead parking lot is on the west side of the Academy grounds, at the foot of the mountains. To drive there you need either a DoD ID card or a sponsored visitor pass arranged through the Academy’s Pass and Registration Office with the sponsorship of an ID holder; adults then show a REAL ID–compliant license with the pass at the gate.',
        'Access rules on military installations change with little notice. Call the Academy Visitor Center at (719) 333-2025 or check its Getting On Base page before you plan around this hike.',
      ],
    },
    {
      heading: 'The hike',
      body: [
        'From the lot, the trail climbs about 1,200 feet in its first mile — the steep part of the hike. Past that the grade eases, and the reservoir is about two miles from the start.',
        'The round trip to the reservoir is a little under 5 miles with roughly 1,500 feet of elevation gain. Most hikers take three to three and a half hours. Leashed dogs are allowed on the trail. Carry plenty of water and start early on summer days.',
      ],
    },
  ],

  faqs: [
    {
      question: 'Can civilians hike Stanley Canyon?',
      answer:
        'Only with base access. The trailhead is on the Air Force Academy, and since March 1, 2026 visitors without a Defense Department ID need a sponsored pass. Call the Visitor Center at (719) 333-2025 to confirm current rules.',
    },
    {
      question: 'How long is the Stanley Canyon Trail?',
      answer:
        'About 2 miles one way to Stanley Canyon Reservoir, or a little under 5 miles round trip, with roughly 1,500 feet of elevation gain — about 1,200 of it in the first mile.',
    },
    {
      question: 'Are dogs allowed on the Stanley Canyon Trail?',
      answer: 'Yes, on a leash.',
    },
  ],

  facts: { allowsDogs: true },

  sources: [
    { label: 'U.S. Air Force Academy — Getting On Base', url: 'https://www.usafa.edu/visitors/getting-on-base/' },
    {
      label: 'KKTV — Air Force Academy suspends Trusted Traveler Program (March 2026)',
      url: 'https://www.kktv.com/2026/03/02/air-force-academy-suspends-trusted-traveler-program-adjusts-access-procedures-based-current-world-situation/',
    },
    { label: 'Visit Colorado Springs — Stanley Canyon', url: 'https://www.visitcos.com/directory/stanley-canyon/' },
  ],

  updated: '2026-09-30',
}

export default stanleyCanyon
