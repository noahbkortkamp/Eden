export interface Tag {
  id: string;
  name: string;
  category: string;
}

export const TAGS_BY_CATEGORY = {
  'Course Design': [
    { id: 'Links', name: 'Links', category: 'Course Type' },
    { id: 'Interesting Layout', name: 'Interesting Layout', category: 'Course Design' },
    { id: 'Historic', name: 'Historic', category: 'Course Type' },
  ],
  'Course Conditions': [
    { id: 'Fast Greens', name: 'Fast Greens', category: 'Course Conditions' },
    { id: 'Slow Greens', name: 'Slow Greens', category: 'Course Conditions' },
    { id: 'Well Maintained', name: 'Well Maintained', category: 'Course Conditions' },
    { id: 'Needs Work', name: 'Needs Work', category: 'Course Conditions' },
  ],
  'Difficulty': [
    { id: 'Beginner Friendly', name: 'Beginner Friendly', category: 'Difficulty' },
    { id: 'Challenging', name: 'Challenging', category: 'Difficulty' },
    { id: 'Tournament Ready', name: 'Tournament Ready', category: 'Difficulty' },
  ],
  'Facilities': [
    { id: 'Clean Facilities', name: 'Clean Facilities', category: 'Facilities' },
    { id: 'Friendly Staff', name: 'Friendly Staff', category: 'Facilities' },
    { id: 'Modern Clubhouse', name: 'Modern Clubhouse', category: 'Facilities' },
  ],
  'Value': [
    { id: 'Great Value', name: 'Great Value', category: 'Value' },
    { id: 'Hidden Gem', name: 'Hidden Gem', category: 'Value' },
    { id: 'Overpriced', name: 'Overpriced', category: 'Value' },
  ],
} as const; 