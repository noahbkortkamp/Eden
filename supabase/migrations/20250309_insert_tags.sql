DO $$
BEGIN
  -- Course Design
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Links' AND category = 'Course Type') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Links', 'Course Type');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Interesting Layout' AND category = 'Course Design') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Interesting Layout', 'Course Design');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Historic' AND category = 'Course Type') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440002', 'Historic', 'Course Type');
  END IF;
  
  -- Course Conditions
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Fast Greens' AND category = 'Course Conditions') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440003', 'Fast Greens', 'Course Conditions');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Slow Greens' AND category = 'Course Conditions') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440004', 'Slow Greens', 'Course Conditions');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Well Maintained' AND category = 'Course Conditions') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440005', 'Well Maintained', 'Course Conditions');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Needs Work' AND category = 'Course Conditions') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440006', 'Needs Work', 'Course Conditions');
  END IF;
  
  -- Difficulty
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Beginner Friendly' AND category = 'Difficulty') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440007', 'Beginner Friendly', 'Difficulty');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Challenging' AND category = 'Difficulty') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440008', 'Challenging', 'Difficulty');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Tournament Ready' AND category = 'Difficulty') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440009', 'Tournament Ready', 'Difficulty');
  END IF;
  
  -- Facilities
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Clean Facilities' AND category = 'Facilities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440010', 'Clean Facilities', 'Facilities');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Friendly Staff' AND category = 'Facilities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440011', 'Friendly Staff', 'Facilities');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Modern Clubhouse' AND category = 'Facilities') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440012', 'Modern Clubhouse', 'Facilities');
  END IF;
  
  -- Value
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Great Value' AND category = 'Value') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440013', 'Great Value', 'Value');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Hidden Gem' AND category = 'Value') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440014', 'Hidden Gem', 'Value');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Overpriced' AND category = 'Value') THEN
    INSERT INTO tags (id, name, category) VALUES ('550e8400-e29b-41d4-a716-446655440015', 'Overpriced', 'Value');
  END IF;
END $$; 