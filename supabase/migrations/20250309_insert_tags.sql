DO $$
BEGIN
  -- Course Design/Type - Change to 'playing_experience' to match constraint
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Links' AND category = 'playing_experience') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Links', 'playing_experience');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Interesting Layout' AND category = 'playing_experience') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Interesting Layout', 'playing_experience');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Historic' AND category = 'playing_experience') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440002', 'Historic', 'playing_experience');
  END IF;
  
  -- Course Conditions - Change to 'course_conditions' (snake_case) to match constraint
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Fast Greens' AND category = 'course_conditions') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440003', 'Fast Greens', 'course_conditions');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Slow Greens' AND category = 'course_conditions') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440004', 'Slow Greens', 'course_conditions');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Well Maintained' AND category = 'course_conditions') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440005', 'Well Maintained', 'course_conditions');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Needs Work' AND category = 'course_conditions') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440006', 'Needs Work', 'course_conditions');
  END IF;
  
  -- Difficulty - Change to 'playing_experience' to match constraint
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Beginner Friendly' AND category = 'playing_experience') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440007', 'Beginner Friendly', 'playing_experience');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Challenging' AND category = 'playing_experience') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440008', 'Challenging', 'playing_experience');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Tournament Ready' AND category = 'playing_experience') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440009', 'Tournament Ready', 'playing_experience');
  END IF;
  
  -- Facilities - Already matches constraint
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Clean Facilities' AND category = 'facilities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440010', 'Clean Facilities', 'facilities');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Friendly Staff' AND category = 'facilities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440011', 'Friendly Staff', 'facilities');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Modern Clubhouse' AND category = 'facilities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440012', 'Modern Clubhouse', 'facilities');
  END IF;
  
  -- Value - Already matches constraint
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Great Value' AND category = 'value') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440013', 'Great Value', 'value');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Hidden Gem' AND category = 'value') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440014', 'Hidden Gem', 'value');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Overpriced' AND category = 'value') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440015', 'Overpriced', 'value');
  END IF;
  
  -- Additional amenities tags
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Great Practice Area' AND category = 'amenities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440016', 'Great Practice Area', 'amenities');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Good Pro Shop' AND category = 'amenities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440017', 'Good Pro Shop', 'amenities');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Great Restaurant' AND category = 'amenities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440018', 'Great Restaurant', 'amenities');
  END IF;
END $$; 