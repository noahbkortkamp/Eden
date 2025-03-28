export interface GolfCourse {
  name: string;
  city: string;
  state: string;
  id: string;
}

export const COURSES: GolfCourse[] = [
  { id: '1', name: "Augusta National Golf Club", city: "Augusta", state: "GA" },
  { id: '2', name: "Pebble Beach Golf Links", city: "Pebble Beach", state: "CA" },
  { id: '3', name: "St Andrews Links (Old Course)", city: "St Andrews", state: "Scotland" },
  { id: '4', name: "Pinehurst No. 2", city: "Pinehurst", state: "NC" },
  { id: '5', name: "Bethpage Black", city: "Farmingdale", state: "NY" },
  { id: '6', name: "TPC Sawgrass", city: "Ponte Vedra Beach", state: "FL" },
  { id: '7', name: "Whistling Straits", city: "Kohler", state: "WI" },
  { id: '8', name: "Torrey Pines Golf Course", city: "La Jolla", state: "CA" },
  { id: '9', name: "Shinnecock Hills Golf Club", city: "Southampton", state: "NY" },
  { id: '10', name: "Oakmont Country Club", city: "Oakmont", state: "PA" },
  { id: '11', name: "Bandon Dunes Golf Resort", city: "Bandon", state: "OR" },
  { id: '12', name: "Merion Golf Club", city: "Ardmore", state: "PA" },
  { id: '13', name: "Winged Foot Golf Club", city: "Mamaroneck", state: "NY" },
  { id: '14', name: "Kiawah Island Ocean Course", city: "Kiawah Island", state: "SC" },
  { id: '15', name: "Chambers Bay", city: "University Place", state: "WA" },
  { id: '16', name: "Erin Hills", city: "Erin", state: "WI" },
  { id: '17', name: "Olympic Club", city: "San Francisco", state: "CA" },
  { id: '18', name: "Riviera Country Club", city: "Pacific Palisades", state: "CA" },
  { id: '19', name: "Muirfield Village", city: "Dublin", state: "OH" },
  { id: '20', name: "Liberty National", city: "Jersey City", state: "NJ" },
];

export const searchCourses = (query: string): GolfCourse[] => {
  if (!query || query.trim() === '') {
    return [];
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return COURSES.filter(course => {
    const normalizedName = course.name.toLowerCase();
    const normalizedCity = course.city.toLowerCase();
    const normalizedState = course.state.toLowerCase();
    
    return (
      normalizedName.includes(normalizedQuery) ||
      normalizedCity.includes(normalizedQuery) ||
      normalizedState.includes(normalizedQuery)
    );
  }).slice(0, 5); // Limit to 5 results
}; 