import { v4 as uuidv4 } from 'uuid';

// Helper type to ensure we only use valid course types
type CourseType = 'public' | 'private' | 'resort' | 'semi-private';

export const sampleCourses = [
  // Famous Real Courses
  {
    id: uuidv4(),
    name: "Augusta National Golf Club",
    location: "Augusta, GA, USA",
    par: 72,
    yardage: 7475,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 33.5021,
    longitude: -82.0229,
    website: "https://www.masters.com",
    phone: "(706) 667-6000"
  },
  {
    id: uuidv4(),
    name: "St Andrews Links - Old Course",
    location: "St Andrews, Scotland, UK",
    par: 72,
    yardage: 7305,
    price_level: 4,
    type: "public" as CourseType,
    latitude: 56.3408,
    longitude: -2.8033,
    website: "https://www.standrews.com",
    phone: "+44 1334 466666"
  },
  {
    id: uuidv4(),
    name: "Pebble Beach Golf Links",
    location: "Pebble Beach, CA, USA",
    par: 72,
    yardage: 7075,
    price_level: 5,
    type: "resort" as CourseType,
    latitude: 36.5725,
    longitude: -121.9486,
    website: "https://www.pebblebeach.com",
    phone: "(800) 654-9300"
  },
  {
    id: uuidv4(),
    name: "Royal Melbourne Golf Club",
    location: "Black Rock, Victoria, Australia",
    par: 72,
    yardage: 6579,
    price_level: 4,
    type: "private" as CourseType,
    latitude: -37.9757,
    longitude: 145.0253,
    website: "https://www.royalmelbourne.com.au",
    phone: "+61 3 9599 0500"
  },
  {
    id: uuidv4(),
    name: "Pinehurst No. 2",
    location: "Pinehurst, NC, USA",
    par: 72,
    yardage: 7588,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 35.1897,
    longitude: -79.4677,
    website: "https://www.pinehurst.com",
    phone: "(855) 235-8507"
  },
  // Modern Championship Courses
  {
    id: uuidv4(),
    name: "TPC Sawgrass",
    location: "Ponte Vedra Beach, FL, USA",
    par: 72,
    yardage: 7245,
    price_level: 5,
    type: "semi-private" as CourseType,
    latitude: 30.1975,
    longitude: -81.3959,
    website: "https://tpc.com/sawgrass",
    phone: "(904) 273-3235"
  },
  {
    id: uuidv4(),
    name: "Whistling Straits",
    location: "Kohler, WI, USA",
    par: 72,
    yardage: 7790,
    price_level: 5,
    type: "resort" as CourseType,
    latitude: 43.8508,
    longitude: -87.7145,
    website: "https://www.destinationkohler.com",
    phone: "(800) 344-2838"
  },
  {
    id: uuidv4(),
    name: "Torrey Pines South",
    location: "La Jolla, CA, USA",
    par: 72,
    yardage: 7698,
    price_level: 3,
    type: "public" as CourseType,
    latitude: 32.8947,
    longitude: -117.2522,
    website: "https://www.torreypinesgolfcourse.com",
    phone: "(858) 452-3226"
  },
  // Hidden Gems
  {
    id: uuidv4(),
    name: "Bandon Dunes",
    location: "Bandon, OR, USA",
    par: 72,
    yardage: 6732,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 43.1873,
    longitude: -124.3939,
    website: "https://www.bandondunesgolf.com",
    phone: "(541) 347-4380"
  },
  {
    id: uuidv4(),
    name: "Cabot Cliffs",
    location: "Inverness, Nova Scotia, Canada",
    par: 72,
    yardage: 6764,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 46.2324,
    longitude: -61.3792,
    website: "https://cabotlinks.com",
    phone: "(855) 652-2268"
  },
  // Adding more courses with a mix of fictional and real data...
  {
    id: uuidv4(),
    name: "Pine Valley Links",
    location: "Mountain View, CA, USA",
    par: 71,
    yardage: 7100,
    price_level: 4,
    type: "private" as CourseType,
    latitude: 37.4133,
    longitude: -122.0817,
    website: "https://pinevalleylinks.com",
    phone: "(650) 555-0123"
  },
  {
    id: uuidv4(),
    name: "Emerald Bay Golf Club",
    location: "Sydney, NSW, Australia",
    par: 72,
    yardage: 6950,
    price_level: 3,
    type: "public" as CourseType,
    latitude: -33.8688,
    longitude: 151.2093,
    website: "https://emeraldbayclub.com.au",
    phone: "+61 2 5555 0123"
  },
  // ... continuing with more courses
  {
    id: uuidv4(),
    name: "Royal County Down",
    location: "Newcastle, Northern Ireland, UK",
    par: 71,
    yardage: 7186,
    price_level: 4,
    type: "semi-private" as CourseType,
    latitude: 54.2164,
    longitude: -5.8885,
    website: "https://www.royalcountydown.org",
    phone: "+44 28 4372 3314"
  },
  {
    id: uuidv4(),
    name: "Bethpage Black",
    location: "Farmingdale, NY, USA",
    par: 71,
    yardage: 7468,
    price_level: 3,
    type: "public" as CourseType,
    latitude: 40.7397,
    longitude: -73.4647,
    website: "https://parks.ny.gov/golf/11/details.aspx",
    phone: "(516) 249-0700"
  },
  {
    id: uuidv4(),
    name: "Valderrama Golf Club",
    location: "Sotogrande, Spain",
    par: 71,
    yardage: 6951,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 36.2814,
    longitude: -5.2883,
    website: "https://www.valderrama.com",
    phone: "+34 956 791 200"
  },
  {
    id: uuidv4(),
    name: "Cape Kidnappers",
    location: "Hawke's Bay, New Zealand",
    par: 71,
    yardage: 7147,
    price_level: 5,
    type: "resort" as CourseType,
    latitude: -39.6458,
    longitude: 177.0879,
    website: "https://www.robertsonlodges.com/the-lodges/cape-kidnappers",
    phone: "+64 6 875 1900"
  },
  {
    id: uuidv4(),
    name: "Shadow Creek",
    location: "Las Vegas, NV, USA",
    par: 72,
    yardage: 7560,
    price_level: 5,
    type: "resort" as CourseType,
    latitude: 36.2116,
    longitude: -115.0694,
    website: "https://shadowcreek.com",
    phone: "(866) 260-0069"
  },
  {
    id: uuidv4(),
    name: "Ballybunion Old Course",
    location: "Ballybunion, Kerry, Ireland",
    par: 71,
    yardage: 6802,
    price_level: 4,
    type: "public" as CourseType,
    latitude: 52.5109,
    longitude: -9.6773,
    website: "https://www.ballybuniongolfclub.com",
    phone: "+353 68 27146"
  },
  {
    id: uuidv4(),
    name: "Kapalua Plantation",
    location: "Maui, HI, USA",
    par: 73,
    yardage: 7596,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 21.0015,
    longitude: -156.6409,
    website: "https://www.golfatkapalua.com",
    phone: "(808) 669-8044"
  },
  {
    id: uuidv4(),
    name: "Kingston Heath",
    location: "Melbourne, Victoria, Australia",
    par: 72,
    yardage: 7102,
    price_level: 4,
    type: "private" as CourseType,
    latitude: -37.9757,
    longitude: 145.0873,
    website: "https://www.kingstonheath.com.au",
    phone: "+61 3 9551 1955"
  },
  {
    id: uuidv4(),
    name: "Carnoustie Golf Links",
    location: "Carnoustie, Scotland, UK",
    par: 72,
    yardage: 7402,
    price_level: 4,
    type: "public" as CourseType,
    latitude: 56.5008,
    longitude: -2.7128,
    website: "https://www.carnoustiegolflinks.com",
    phone: "+44 1241 802270"
  },
  {
    id: uuidv4(),
    name: "Riviera Country Club",
    location: "Pacific Palisades, CA, USA",
    par: 71,
    yardage: 7040,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 34.0492,
    longitude: -118.5012,
    website: "https://www.therivieracountryclub.com",
    phone: "(310) 454-6591"
  },
  // Municipal Courses
  {
    id: uuidv4(),
    name: "Harding Park",
    location: "San Francisco, CA, USA",
    par: 72,
    yardage: 7169,
    price_level: 3,
    type: "public" as CourseType,
    latitude: 37.7280,
    longitude: -122.4933,
    website: "https://tpc.com/hardingpark",
    phone: "(415) 664-4690"
  },
  {
    id: uuidv4(),
    name: "Chambers Bay",
    location: "University Place, WA, USA",
    par: 72,
    yardage: 7585,
    price_level: 3,
    type: "public" as CourseType,
    latitude: 47.2003,
    longitude: -122.5711,
    website: "https://www.chambersbaygolf.com",
    phone: "(253) 460-4653"
  },
  // Desert Courses
  {
    id: uuidv4(),
    name: "Desert Mountain - Chiricahua",
    location: "Scottsdale, AZ, USA",
    par: 72,
    yardage: 7197,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 33.8673,
    longitude: -111.8747,
    website: "https://desertmountain.com",
    phone: "(480) 488-1363"
  },
  {
    id: uuidv4(),
    name: "Emirates Golf Club",
    location: "Dubai, UAE",
    par: 72,
    yardage: 7301,
    price_level: 4,
    type: "semi-private" as CourseType,
    latitude: 25.1179,
    longitude: 55.1713,
    website: "https://www.dubaigolf.com/emirates-golf-club",
    phone: "+971 4 380 1234"
  },
  // Mountain Courses
  {
    id: uuidv4(),
    name: "Banff Springs",
    location: "Banff, Alberta, Canada",
    par: 71,
    yardage: 6938,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 51.1644,
    longitude: -115.5619,
    website: "https://www.fairmont.com/banff-springs/golf",
    phone: "(403) 762-6801"
  },
  // Links Courses
  {
    id: uuidv4(),
    name: "Royal Portrush",
    location: "Portrush, Northern Ireland, UK",
    par: 72,
    yardage: 7344,
    price_level: 4,
    type: "semi-private" as CourseType,
    latitude: 55.2007,
    longitude: -6.6375,
    website: "https://www.royalportrushgolfclub.com",
    phone: "+44 28 7082 2311"
  },
  // Parkland Courses
  {
    id: uuidv4(),
    name: "Winged Foot West",
    location: "Mamaroneck, NY, USA",
    par: 72,
    yardage: 7477,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 40.9587,
    longitude: -73.7674,
    website: "https://www.wfgc.org",
    phone: "(914) 698-8400"
  },
  {
    id: uuidv4(),
    name: "Medinah Country Club No. 3",
    location: "Medinah, IL, USA",
    par: 72,
    yardage: 7657,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 41.9747,
    longitude: -88.0355,
    website: "https://www.medinahcc.org",
    phone: "(630) 773-1700"
  },
  // Asian Courses
  {
    id: uuidv4(),
    name: "Hirono Golf Club",
    location: "Hyogo, Japan",
    par: 72,
    yardage: 7169,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 34.7503,
    longitude: 134.8503,
    website: "https://www.hironogolfclub.jp",
    phone: "+81 794-83-0111"
  },
  {
    id: uuidv4(),
    name: "Nine Bridges",
    location: "Jeju Island, South Korea",
    par: 72,
    yardage: 7196,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 33.3066,
    longitude: 126.8402,
    website: "https://www.ninebridges.co.kr",
    phone: "+82 64-793-9999"
  },
  // South American Courses
  {
    id: uuidv4(),
    name: "Olivos Golf Club",
    location: "Buenos Aires, Argentina",
    par: 72,
    yardage: 6950,
    price_level: 4,
    type: "private" as CourseType,
    latitude: -34.4853,
    longitude: -58.6472,
    website: "https://www.olivosgolf.com.ar",
    phone: "+54 11 4799-1600"
  },
  // Modern Resort Courses
  {
    id: uuidv4(),
    name: "Streamsong Red",
    location: "Bowling Green, FL, USA",
    par: 72,
    yardage: 7148,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 27.6634,
    longitude: -81.9334,
    website: "https://www.streamsongresort.com",
    phone: "(863) 354-6980"
  },
  // Hidden Gems
  {
    id: uuidv4(),
    name: "Pacific Dunes",
    location: "Bandon, OR, USA",
    par: 71,
    yardage: 6633,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 43.1873,
    longitude: -124.3939,
    website: "https://www.bandondunesgolf.com",
    phone: "(541) 347-4380"
  },
  // Historic Courses
  {
    id: uuidv4(),
    name: "Merion Golf Club East",
    location: "Ardmore, PA, USA",
    par: 70,
    yardage: 6846,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 39.9906,
    longitude: -75.3121,
    website: "https://www.meriongolfclub.com",
    phone: "(610) 642-5600"
  },
  // Stadium Courses
  {
    id: uuidv4(),
    name: "PGA West Stadium Course",
    location: "La Quinta, CA, USA",
    par: 72,
    yardage: 7300,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 33.6762,
    longitude: -116.2355,
    website: "https://www.pgawest.com",
    phone: "(760) 564-7100"
  },
  // European Tour Venues
  {
    id: uuidv4(),
    name: "Wentworth Club West Course",
    location: "Virginia Water, Surrey, UK",
    par: 72,
    yardage: 7284,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 51.3897,
    longitude: -0.6027,
    website: "https://www.wentworthclub.com",
    phone: "+44 1344 842201"
  },
  // Modern American Classics
  {
    id: uuidv4(),
    name: "Wade Hampton",
    location: "Cashiers, NC, USA",
    par: 72,
    yardage: 7218,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 35.1105,
    longitude: -83.0968,
    website: "https://www.wadehamptongc.com",
    phone: "(828) 743-5899"
  },
  // Canadian Gems
  {
    id: uuidv4(),
    name: "St. George's Golf and Country Club",
    location: "Toronto, Ontario, Canada",
    par: 71,
    yardage: 7014,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 43.6532,
    longitude: -79.5017,
    website: "https://www.stgeorges.org",
    phone: "(416) 231-3393"
  },
  {
    id: uuidv4(),
    name: "Jasper Park Lodge Golf Club",
    location: "Jasper, Alberta, Canada",
    par: 71,
    yardage: 6663,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 52.8753,
    longitude: -118.0844,
    website: "https://www.fairmont.com/jasper/golf",
    phone: "(780) 852-6090"
  },
  // Australian Sandbelt
  {
    id: uuidv4(),
    name: "New South Wales Golf Club",
    location: "La Perouse, NSW, Australia",
    par: 72,
    yardage: 6936,
    price_level: 4,
    type: "private" as CourseType,
    latitude: -33.9837,
    longitude: 151.2333,
    website: "https://www.nswgolfclub.com.au",
    phone: "+61 2 9661 4455"
  },
  // Continental Europe
  {
    id: uuidv4(),
    name: "Golf Club de Morfontaine",
    location: "Morfontaine, France",
    par: 70,
    yardage: 6584,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 49.1361,
    longitude: 2.5881,
    website: "https://www.golfdemorfontaine.fr",
    phone: "+33 3 44 54 68 27"
  },
  // Modern Public Courses
  {
    id: uuidv4(),
    name: "Gamble Sands",
    location: "Brewster, WA, USA",
    par: 72,
    yardage: 7169,
    price_level: 3,
    type: "public" as CourseType,
    latitude: 48.0953,
    longitude: -119.7731,
    website: "https://www.gamblesands.com",
    phone: "(509) 436-8323"
  },
  // Florida Courses
  {
    id: uuidv4(),
    name: "Seminole Golf Club",
    location: "Juno Beach, FL, USA",
    par: 72,
    yardage: 6836,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 26.8901,
    longitude: -80.0544,
    website: "https://www.seminolegc.org",
    phone: "(561) 626-0280"
  },
  // California Classics
  {
    id: uuidv4(),
    name: "California Golf Club of San Francisco",
    location: "South San Francisco, CA, USA",
    par: 72,
    yardage: 7216,
    price_level: 5,
    type: "private" as CourseType,
    latitude: 37.6688,
    longitude: -122.4411,
    website: "https://www.calgolfclub.com",
    phone: "(650) 589-0144"
  },
  // Modern Destination Courses
  {
    id: uuidv4(),
    name: "Tara Iti Golf Club",
    location: "Mangawhai, New Zealand",
    par: 71,
    yardage: 6840,
    price_level: 5,
    type: "private" as CourseType,
    latitude: -36.1270,
    longitude: 174.5972,
    website: "https://www.taraiti.com",
    phone: "+64 9 431 4600"
  },
  // Scottish Links
  {
    id: uuidv4(),
    name: "North Berwick Golf Club",
    location: "North Berwick, Scotland, UK",
    par: 71,
    yardage: 6464,
    price_level: 4,
    type: "public" as CourseType,
    latitude: 56.0520,
    longitude: -2.7183,
    website: "https://www.northberwickgolfclub.com",
    phone: "+44 1620 892135"
  },
  // Modern Resort Courses
  {
    id: uuidv4(),
    name: "Streamsong Blue",
    location: "Bowling Green, FL, USA",
    par: 72,
    yardage: 7176,
    price_level: 4,
    type: "resort" as CourseType,
    latitude: 27.6634,
    longitude: -81.9334,
    website: "https://www.streamsongresort.com",
    phone: "(863) 354-6980"
  }
]; 