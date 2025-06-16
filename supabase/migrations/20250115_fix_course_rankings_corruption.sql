-- Fix course rankings corruption by creating missing database function and adding constraints
-- This addresses the critical data integrity issue where duplicate positions were being created

-- Step 1: Create the missing swap_course_rankings function
CREATE OR REPLACE FUNCTION swap_course_rankings(
  preferred_ranking_id UUID,
  other_ranking_id UUID
)
RETURNS void AS $$
DECLARE
  preferred_position INTEGER;
  other_position INTEGER;
BEGIN
  -- Get current positions
  SELECT rank_position INTO preferred_position 
  FROM course_rankings 
  WHERE id = preferred_ranking_id;
  
  SELECT rank_position INTO other_position 
  FROM course_rankings 
  WHERE id = other_ranking_id;
  
  -- Validate that both rankings exist
  IF preferred_position IS NULL OR other_position IS NULL THEN
    RAISE EXCEPTION 'One or both ranking records not found';
  END IF;
  
  -- Use a temporary negative value to avoid constraint conflicts during swap
  UPDATE course_rankings 
  SET rank_position = -999999
  WHERE id = preferred_ranking_id;
  
  -- Move other course to preferred's original position
  UPDATE course_rankings 
  SET rank_position = preferred_position
  WHERE id = other_ranking_id;
  
  -- Move preferred course to other's original position  
  UPDATE course_rankings 
  SET rank_position = other_position
  WHERE id = preferred_ranking_id;
  
END;
$$ LANGUAGE plpgsql;

-- Step 2: Add comparison count increment function if it doesn't exist
CREATE OR REPLACE FUNCTION increment_comparison_count(
  user_id_param UUID,
  course_id_params UUID[]
)
RETURNS void AS $$
BEGIN
  UPDATE course_rankings 
  SET comparison_count = comparison_count + 1
  WHERE user_id = user_id_param 
  AND course_id = ANY(course_id_params);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Add unique constraint to prevent duplicate positions
-- First, let's clean up any existing duplicates before adding the constraint
-- This will reassign positions sequentially based on current relative_score (highest score = position 1)
WITH ranked_courses AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, sentiment_category 
      ORDER BY relative_score DESC, created_at ASC
    ) as new_position
  FROM course_rankings
)
UPDATE course_rankings 
SET rank_position = ranked_courses.new_position
FROM ranked_courses 
WHERE course_rankings.id = ranked_courses.id;

-- Now add the unique constraint to prevent future duplicates
ALTER TABLE course_rankings 
ADD CONSTRAINT unique_user_sentiment_position 
UNIQUE (user_id, sentiment_category, rank_position);

-- Step 4: Add comparison_count column if it doesn't exist (for the increment function)
ALTER TABLE course_rankings 
ADD COLUMN IF NOT EXISTS comparison_count INTEGER DEFAULT 0;

-- Add index for better performance on comparison count updates
CREATE INDEX IF NOT EXISTS idx_course_rankings_comparison_count 
ON course_rankings(user_id, course_id); 