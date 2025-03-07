export interface Tag {
  id: string;
  name: string;
  category: string;
}

export const TAGS_BY_CATEGORY = {
  'Course Style & Design': [
    { id: 'links', name: 'Links', category: 'Course Style & Design' },
    { id: 'parkland', name: 'Parkland', category: 'Course Style & Design' },
    { id: 'desert', name: 'Desert', category: 'Course Style & Design' },
    { id: 'heathland', name: 'Heathland', category: 'Course Style & Design' },
    { id: 'interesting_layout', name: 'Interesting Layout', category: 'Course Style & Design' },
    { id: 'historic', name: 'Historic Course', category: 'Course Style & Design' },
  ],
  'Course Conditions': [
    { id: 'fast_greens', name: 'Fast Greens', category: 'Course Conditions' },
    { id: 'slow_greens', name: 'Slow Greens', category: 'Course Conditions' },
    { id: 'wide_fairways', name: 'Wide Fairways', category: 'Course Conditions' },
    { id: 'narrow_fairways', name: 'Narrow Fairways', category: 'Course Conditions' },
    { id: 'nice_bunkers', name: 'Nice Bunkers', category: 'Course Conditions' },
    { id: 'well_maintained_tees', name: 'Well-Maintained Tee Boxes', category: 'Course Conditions' },
  ],
  'Amenities & Experience': [
    { id: 'food_drink', name: 'Food & Drink', category: 'Amenities & Experience' },
    { id: 'staff', name: 'The Staff', category: 'Amenities & Experience' },
    { id: 'clubhouse', name: 'The Clubhouse', category: 'Amenities & Experience' },
    { id: 'water_coolers', name: 'Water Coolers on Course', category: 'Amenities & Experience' },
    { id: 'cart_service', name: 'Cart Girl Service', category: 'Amenities & Experience' },
    { id: 'turn_shack', name: 'Turn Shack for Snacks', category: 'Amenities & Experience' },
    { id: 'nice_carts', name: 'Nice Carts', category: 'Amenities & Experience' },
  ],
  'Playability & Value': [
    { id: 'walkable', name: 'Walkable', category: 'Playability & Value' },
    { id: 'pace_of_play', name: 'Pace of Play', category: 'Playability & Value' },
    { id: 'value', name: 'Value for the Money', category: 'Playability & Value' },
    { id: 'municipal', name: 'Municipal Golf Course', category: 'Playability & Value' },
  ],
} as const; 