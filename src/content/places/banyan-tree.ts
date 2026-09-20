import type { PlaceEditorial } from '@/lib/place-editorial'

/**
 * /places/banyan-tree-kawela-bay-oahu — the Kawela Bay banyan on O'ahu's
 * North Shore.
 *
 * This was published at /places/banyan-tree until that URL was given over to
 * the hotel hub, which is where the commercial half of the "banyan tree"
 * searches was always going (see docs/seo/semrush-2026-09-12/). The hub links
 * here in its first screen, so the people who wanted the tree still land on
 * it. People arrive having searched the tree by name, so the page has to
 * answer what it is, where it is and how to reach it before anything else.
 */
const banyanTree: PlaceEditorial = {
  displayName: 'Kawela Bay Banyan Tree',

  metaDescription:
    'The Kawela Bay banyan tree on O‘ahu’s North Shore — the "Lost" filming site near Kahuku. How to find the unmarked trailhead, what the 5-minute walk is like, and what to bring.',

  lede: [
    'The banyan at Kawela Bay is one of the most photographed trees in Hawai‘i, and one of the easiest to walk straight past. It stands a few minutes off Kamehameha Highway near Kahuku, at the northern tip of O‘ahu, screened from the road by a wall of ironwood and hau. There is no gate, no ticket and no sign at the turn-off — which is most of the reason the crowds that fill the rest of the North Shore never reach it.',
    'What you find at the end of the path is less a tree than a small forest with one trunk somewhere in the middle of it. Banyans grow by dropping aerial roots from their branches; each root that reaches soil thickens into a new trunk, and the canopy walks outward on them. This one has been walking for a long time. The crown runs well over a hundred feet across, the roots hang in curtains you can stand inside, and the ground beneath stays cool and dim even at midday.',
    'The tree sits just behind the beach at Kawela Bay, a shallow crescent tucked behind The Ritz-Carlton O‘ahu, Turtle Bay — the resort a mile east along the same highway, which until 2024 was Turtle Bay Resort. Most people come for both: the tree first, then ten minutes further to a calm, shaded bay where green sea turtles feed close in. Google reviewers rate it 4.7 out of 5 across more than 260 reviews, which for a tree with no facilities, no staff and no admission is about as clear a verdict as the format allows.',
  ],

  sections: [
    {
      heading: 'Finding it',
      body: [
        'The tree is reached from Kamehameha Highway near Kahuku. Roadside parking is informal and limited, and the trailhead is an unmarked break in the treeline rather than a signed entrance — it is worth pinning the location on your phone before you set out, because there is nothing at the highway to tell you it is there.',
        'From the road it is a short, flat walk of roughly a hundred yards through ironwood forest, five minutes at an easy pace. The ground is sand and packed dirt, level the whole way, and fine in trainers. It is not a hike. If you want to make a longer outing of it, the Banyan Tree Route that links the tree through to Turtle Bay is a 1.8-mile loop rated easy, around forty minutes at walking pace.',
        'The forest floor is often damp and the path can turn muddy for a day or two after rain. Mosquitoes are persistent in the shade year-round, which is the single thing most visitors say they wish they had known.',
      ],
    },
    {
      heading: 'Kawela Bay, just beyond',
      body: [
        'Keep walking past the tree and the forest opens onto Kawela Bay. It is a small crescent of sand, shallow and reef-sheltered, with none of the surf the North Shore is famous for a few miles west. The water is usually calm enough for children, and green sea turtles come in to feed close to shore — close enough that the state’s ten-foot minimum distance rule is worth knowing before you go in.',
        'The bay is better suited to snorkelling, shade and an afternoon in a hammock than to swimming lengths. There are no lifeguards, no restrooms and no concessions anywhere along this stretch, so bring water and take everything out with you.',
      ],
    },
    {
      heading: 'The screen history',
      body: [
        'Kawela Bay and its banyans have been standing in for somewhere else on screen for decades. The tree is best known to visitors from Lost, which shot extensively around the bay across its run — enough that the listing is filed on some travel sites simply as the "Lost" Banyan Tree. The wider bay was also used during the O‘ahu production of Pirates of the Caribbean: On Stranger Tides.',
        'That reputation is what brings most people down the path, and it is worth setting expectations: there is no set, no marker and nothing staged. What survives is the location itself, which is the part that was doing the work in the first place.',
      ],
    },
    {
      heading: 'Treading lightly',
      body: [
        'Banyans are not native to Hawai‘i. They were introduced and planted widely for their shade, and this corner of the island was sugarcane country for the best part of a century before the plantations closed — the forest you walk through is younger than it looks. The trees have long since become part of how the North Shore reads, but they are a layer on the landscape rather than the original one.',
        'In recent years the banyans nearest the beach access have been roped off, with interpretive signs added, to keep foot traffic off the root plate. Aerial roots look like rope and are not: they are living tissue, and a banyan that has been climbed and swung on shows it for decades. Stay on the path, stay outside the ropes where they are up, and do not carve anything.',
      ],
    },
  ],

  // Robert Linsdell photographed the tree and the beach park on one afternoon in
  // October 2014 and released the set under CC BY 2.0 — the only free-licensed
  // pictures of this banyan on Commons, and the only ones that show the trunk
  // wall at the scale visitors describe. Ordered hero first.
  photos: [
    {
      caption:
        'The banyan at Kawela Bay: a single tree whose aerial roots have thickened into a wall of trunks.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503550%29_%2819473913514%29.jpg/1280px-Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503550%29_%2819473913514%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 853,
        title: 'Banyan Tree. Kawela Bay Beach Park, Kahuku (503550) (19473913514)',
        author: 'Robert Linsdell from St. Andrews, Canada',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Banyan_Tree._Kawela_Bay_Beach_Park,_Kahuku_(503550)_(19473913514).jpg',
      },
    },
    {
      caption: 'Two visitors at the interpretive sign give the scale of the root wall.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503551%29_%2820113857291%29.jpg/1280px-Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503551%29_%2820113857291%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 853,
        title: 'Banyan Tree. Kawela Bay Beach Park, Kahuku (503551) (20113857291)',
        author: 'Robert Linsdell from St. Andrews, Canada',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Banyan_Tree._Kawela_Bay_Beach_Park,_Kahuku_(503551)_(20113857291).jpg',
      },
    },
    {
      caption: 'Aerial roots hanging from the horizontal limbs, on their way to becoming trunks.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503559%29_%2820130121736%29.jpg/1280px-Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503559%29_%2820130121736%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 853,
        title: 'Banyan Tree. Kawela Bay Beach Park, Kahuku (503559) (20130121736)',
        author: 'Robert Linsdell from St. Andrews, Canada',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Banyan_Tree._Kawela_Bay_Beach_Park,_Kahuku_(503559)_(20130121736).jpg',
      },
    },
    {
      caption: 'Midday sun through the canopy, which runs well over a hundred feet across.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503556%29_%2819941205378%29.jpg/1280px-Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503556%29_%2819941205378%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 853,
        title: 'Banyan Tree. Kawela Bay Beach Park, Kahuku (503556) (19941205378)',
        author: 'Robert Linsdell from St. Andrews, Canada',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Banyan_Tree._Kawela_Bay_Beach_Park,_Kahuku_(503556)_(19941205378).jpg',
      },
    },
    {
      caption: 'The shaded clearing under the crown, on the path through to Kawela Bay.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503561%29_%2820130112196%29.jpg/1280px-Banyan_Tree._Kawela_Bay_Beach_Park%2C_Kahuku_%28503561%29_%2820130112196%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 853,
        title: 'Banyan Tree. Kawela Bay Beach Park, Kahuku (503561) (20130112196)',
        author: 'Robert Linsdell from St. Andrews, Canada',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Banyan_Tree._Kawela_Bay_Beach_Park,_Kahuku_(503561)_(20130112196).jpg',
      },
    },
    {
      caption:
        'The sign on site, naming the ahupua‘a of ‘Ōpana-Kawela and the films shot here.',
      photo: {
        url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Kawela_Bay_Beach_Park%2C_Kahuku_%28503548%29_%2820096558335%29.jpg/1280px-Kawela_Bay_Beach_Park%2C_Kahuku_%28503548%29_%2820096558335%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
        width: 1280,
        height: 720,
        title: 'Kawela Bay Beach Park, Kahuku (503548) (20096558335)',
        author: 'Robert Linsdell from St. Andrews, Canada',
        license: 'CC BY 2.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
        sourceUrl:
          'https://commons.wikimedia.org/wiki/File:Kawela_Bay_Beach_Park,_Kahuku_(503548)_(20096558335).jpg',
      },
    },
  ],

  faqs: [
    {
      question: 'Is the Kawela Bay banyan tree free to visit?',
      answer:
        'Yes. There is no admission, no gate and no staff. Roadside parking near the trailhead on Kamehameha Highway is informal and limited, so arriving early helps on busy days.',
    },
    {
      question: 'How long is the walk to the banyan tree?',
      answer:
        'About five minutes. It is roughly a hundred yards of flat, sandy path through ironwood forest from Kamehameha Highway — no climbing and no elevation. The longer Banyan Tree Route loop through to Turtle Bay is 1.8 miles and takes around forty minutes.',
    },
    {
      question: 'Is this the banyan tree from Lost?',
      answer:
        'Yes. The banyans at Kawela Bay appeared repeatedly in Lost, and some travel listings name the site the "Lost" Banyan Tree for that reason. The bay was also used during the O‘ahu filming of Pirates of the Caribbean: On Stranger Tides. Nothing from either production remains on site.',
    },
    {
      question: 'Can you swim at Kawela Bay?',
      answer:
        'You can, and the bay is unusually calm for the North Shore because the reef shelters it. There are no lifeguards or restrooms, and green sea turtles feed close to shore — Hawai‘i asks that you stay at least ten feet away from them.',
    },
    {
      question: 'What should I bring?',
      answer:
        'Insect repellent above all — the shaded forest floor holds mosquitoes year-round and it is the most common complaint from visitors. Otherwise water, reef-safe sunscreen for the bay, and shoes you do not mind getting muddy after rain.',
    },
  ],

  sources: [
    { label: 'Banyan Tree Route on AllTrails', url: 'https://www.alltrails.com/trail/hawaii/oahu/banyan-tree-route' },
    {
      label: '"Lost" Banyan Tree on Tripadvisor',
      url: 'https://www.tripadvisor.com/Attraction_Review-g60651-d21093593-Reviews-Lost_Banyan_Tree-Kahuku_Oahu_Hawaii.html',
    },
  ],

  updated: '2026-09-20',
}

export default banyanTree
