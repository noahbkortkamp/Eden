export interface Tag {
  id: string;
  name: string;
  category: string;
}

export const TAGS_BY_CATEGORY = {
  'Course Design': [
    { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Links', category: 'Course Type' },
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Interesting Layout', category: 'Course Design' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Historic', category: 'Course Type' },
  ],
  'Course Conditions': [
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Fast Greens', category: 'Course Conditions' },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Slow Greens', category: 'Course Conditions' },
    { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Well Maintained', category: 'Course Conditions' },
    { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Needs Work', category: 'Course Conditions' },
  ],
  'Difficulty': [
    { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Beginner Friendly', category: 'Difficulty' },
    { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Challenging', category: 'Difficulty' },
    { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Tournament Ready', category: 'Difficulty' },
  ],
  'Facilities': [
    { id: '550e8400-e29b-41d4-a716-446655440010', name: 'Clean Facilities', category: 'Facilities' },
    { id: '550e8400-e29b-41d4-a716-446655440011', name: 'Friendly Staff', category: 'Facilities' },
    { id: '550e8400-e29b-41d4-a716-446655440012', name: 'Modern Clubhouse', category: 'Facilities' },
  ],
  'Value': [
    { id: '550e8400-e29b-41d4-a716-446655440013', name: 'Great Value', category: 'Value' },
    { id: '550e8400-e29b-41d4-a716-446655440014', name: 'Hidden Gem', category: 'Value' },
    { id: '550e8400-e29b-41d4-a716-446655440015', name: 'Overpriced', category: 'Value' },
  ],
} as const; 