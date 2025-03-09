-- First, delete all existing tags (this will cascade to review_tags)
DELETE FROM tags;

-- Then insert tags with specific UUIDs that match our frontend
INSERT INTO tags (id, name, category) VALUES
  -- Course Design
  ('550e8400-e29b-41d4-a716-446655440000', 'Links', 'Course Type'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Interesting Layout', 'Course Design'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Historic', 'Course Type'),
  -- Course Conditions
  ('550e8400-e29b-41d4-a716-446655440003', 'Fast Greens', 'Course Conditions'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Slow Greens', 'Course Conditions'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Well Maintained', 'Course Conditions'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Needs Work', 'Course Conditions'),
  -- Difficulty
  ('550e8400-e29b-41d4-a716-446655440007', 'Beginner Friendly', 'Difficulty'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Challenging', 'Difficulty'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Tournament Ready', 'Difficulty'),
  -- Facilities
  ('550e8400-e29b-41d4-a716-446655440010', 'Clean Facilities', 'Facilities'),
  ('550e8400-e29b-41d4-a716-446655440011', 'Friendly Staff', 'Facilities'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Modern Clubhouse', 'Facilities'),
  -- Value
  ('550e8400-e29b-41d4-a716-446655440013', 'Great Value', 'Value'),
  ('550e8400-e29b-41d4-a716-446655440014', 'Hidden Gem', 'Value'),
  ('550e8400-e29b-41d4-a716-446655440015', 'Overpriced', 'Value')
ON CONFLICT (name, category) DO UPDATE 
SET id = EXCLUDED.id; 