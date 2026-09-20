/**
 * Named outdoor landmarks, resolved by name rather than by metro sweep.
 *
 * `ingest-places.ts` searches a 30km radius around 50 city centres. That finds
 * municipal parks well and destinations badly: the places people search by name
 * and travel to on purpose are mostly nowhere near a city centre, and many are
 * typed `tourist_attraction` or `natural_feature` rather than `park`, so even a
 * sweep that reached them would filter them out.
 *
 * The evidence for this list is the domain's own history. The single page that
 * carried the great majority of the previous site's organic traffic was the
 * Kawela Bay banyan — 50km from Honolulu, typed `tourist_attraction`, and
 * therefore unreachable by every sweep the ingest script can run. See
 * docs/seo/semrush-2026-09-12/.
 *
 * `name` is what the page is published as and what the resolver checks Google's
 * answer against; `query` is only how we find it. A wrong guess at a name costs
 * one API call and is rejected — it cannot publish the wrong place under the
 * right URL. So err toward adding candidates.
 */

export type Landmark = {
  /**
   * The landmark's name as Google Places holds it. The slug is derived from
   * this, and the resolver rejects any result whose name does not reduce to it.
   */
  name: string
  /** Search text: the name plus whatever locality it takes to disambiguate. */
  query: string
}

export const LANDMARKS: Landmark[] = [
  // --- Hawai‘i ---------------------------------------------------------
  // The proven cluster. The previous site's traffic was overwhelmingly here,
  // and the surviving keywords ("banyan tree hawaii", "historic banyan tree")
  // still are.
  { name: 'Kawela Bay', query: 'Kawela Bay Kahuku HI' },
  { name: 'Lahaina Banyan Court Park', query: 'Lahaina Banyan Court Park Lahaina Maui HI' },
  { name: 'Manoa Falls', query: 'Manoa Falls Trail Honolulu HI' },
  { name: 'Waimea Bay', query: 'Waimea Bay Beach Park Haleiwa HI' },
  { name: 'Lanikai Beach', query: 'Lanikai Beach Kailua HI' },
  { name: 'Hanauma Bay Nature Preserve', query: 'Hanauma Bay Nature Preserve Honolulu HI' },
  { name: 'Diamond Head State Monument', query: 'Diamond Head State Monument Honolulu HI' },
  { name: 'Akaka Falls State Park', query: 'Akaka Falls State Park Honomu HI' },
  { name: 'Waipi‘o Valley Lookout', query: 'Waipio Valley Lookout Waimea HI' },
  { name: 'Nāpali Coast State Wilderness Park', query: 'Napali Coast State Wilderness Park Kauai HI' },

  // --- Utah / Arizona ---------------------------------------------------
  { name: 'Delicate Arch', query: 'Delicate Arch Arches National Park Moab UT' },
  { name: 'Angels Landing', query: 'Angels Landing Zion National Park Springdale UT' },
  { name: 'The Narrows', query: 'The Narrows Zion National Park UT' },
  { name: 'Horseshoe Bend', query: 'Horseshoe Bend Page AZ' },
  { name: 'Antelope Canyon', query: 'Antelope Canyon Page AZ' },
  { name: 'Havasu Falls', query: 'Havasu Falls Supai AZ' },
  { name: 'Mather Point', query: 'Mather Point Grand Canyon Village AZ' },
  { name: 'Monument Valley', query: 'Monument Valley Navajo Tribal Park UT AZ' },

  // --- California -------------------------------------------------------
  { name: 'Half Dome', query: 'Half Dome Yosemite National Park CA' },
  { name: 'El Capitan', query: 'El Capitan Yosemite National Park CA' },
  { name: 'Yosemite Falls', query: 'Yosemite Falls Yosemite National Park CA' },
  { name: 'Glacier Point', query: 'Glacier Point Yosemite National Park CA' },
  { name: 'McWay Falls', query: 'McWay Falls Big Sur CA' },
  { name: 'Bixby Creek Bridge', query: 'Bixby Creek Bridge Big Sur CA' },
  { name: 'Mono Lake', query: 'Mono Lake Lee Vining CA' },

  // --- Pacific Northwest ------------------------------------------------
  { name: 'Multnomah Falls', query: 'Multnomah Falls Bridal Veil OR' },
  { name: 'Haystack Rock', query: 'Haystack Rock Cannon Beach OR' },
  { name: 'Crater Lake National Park', query: 'Crater Lake National Park OR' },
  { name: 'Cape Flattery', query: 'Cape Flattery Neah Bay WA' },

  // --- Rockies ----------------------------------------------------------
  { name: 'Old Faithful', query: 'Old Faithful Geyser Yellowstone National Park WY' },
  { name: 'Grand Prismatic Spring', query: 'Grand Prismatic Spring Yellowstone National Park WY' },
  { name: 'Jenny Lake', query: 'Jenny Lake Grand Teton National Park Moose WY' },
  { name: 'Devils Tower National Monument', query: 'Devils Tower National Monument Devils Tower WY' },
  { name: 'Maroon Bells', query: 'Maroon Bells Aspen CO' },
  { name: 'Hanging Lake', query: 'Hanging Lake Glenwood Springs CO' },
  { name: 'Great Sand Dunes National Park and Preserve', query: 'Great Sand Dunes National Park Mosca CO' },

  // --- Southwest / Plains ------------------------------------------------
  { name: 'White Sands National Park', query: 'White Sands National Park Alamogordo NM' },
  { name: 'Carlsbad Caverns National Park', query: 'Carlsbad Caverns National Park Carlsbad NM' },
  { name: 'Mount Rushmore National Memorial', query: 'Mount Rushmore National Memorial Keystone SD' },
  { name: 'Badlands National Park', query: 'Badlands National Park Interior SD' },

  // --- East -------------------------------------------------------------
  // "hole in the wall beach nia…" is a surviving keyword on the domain, so the
  // Niagara cluster already has some traction to build on.
  { name: 'Niagara Falls State Park', query: 'Niagara Falls State Park Niagara Falls NY' },
  { name: 'Watkins Glen State Park', query: 'Watkins Glen State Park Watkins Glen NY' },
  { name: 'Cadillac Mountain', query: 'Cadillac Mountain Acadia National Park Bar Harbor ME' },
  { name: 'Clingmans Dome', query: 'Clingmans Dome Great Smoky Mountains National Park TN' },
  { name: 'Blue Ridge Parkway', query: 'Blue Ridge Parkway Asheville NC' },
  { name: 'Cumberland Falls State Resort Park', query: 'Cumberland Falls State Resort Park Corbin KY' },
]
