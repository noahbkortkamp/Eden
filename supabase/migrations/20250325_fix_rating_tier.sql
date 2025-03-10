-- Drop the problematic index if it exists
DROP INDEX IF EXISTS idx_courses_rating_tier;

-- Add rating_tier column to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS rating_tier INTEGER;

-- Recreate the index after adding the column
CREATE INDEX IF NOT EXISTS idx_courses_rating_tier ON courses(rating_tier); 