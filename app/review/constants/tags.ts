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
  'Difficulty': [
    { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Beginner Friendly', category: 'Difficulty' },
    { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Challenging', category: 'Difficulty' },
    { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Tournament Ready', category: 'Difficulty' },
  ],
  'Value': [
    { id: '550e8400-e29b-41d4-a716-446655440013', name: 'Great Value', category: 'Value' },
    { id: '550e8400-e29b-41d4-a716-446655440014', name: 'Hidden Gem', category: 'Value' },
    { id: '550e8400-e29b-41d4-a716-446655440015', name: 'Overpriced', category: 'Value' },
  ],
} as const; 