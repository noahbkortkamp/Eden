-- Update courses table to include new fields
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS par integer,
ADD COLUMN IF NOT EXISTS yardage integer;

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) NOT NULL,
  course_id uuid REFERENCES courses(id) NOT NULL,
  rating text NOT NULL CHECK (rating IN ('liked', 'fine', 'didnt_like')),
  notes text,
  favorite_holes jsonb, -- Array of hole numbers
  photos jsonb, -- Array of photo URLs
  date_played date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id, date_played) -- One review per user per course per date
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, category)
);

-- Create review_tags junction table
CREATE TABLE IF NOT EXISTS review_tags (
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (review_id, tag_id)
);

-- Enable RLS on new tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Reviews are viewable by everyone
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own reviews
DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tags are viewable by everyone
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON tags;
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

-- Review tags are viewable by everyone
DROP POLICY IF EXISTS "Review tags are viewable by everyone" ON review_tags;
CREATE POLICY "Review tags are viewable by everyone"
  ON review_tags FOR SELECT
  TO authenticated
  USING (true);

-- Users can add tags to their own reviews
DROP POLICY IF EXISTS "Users can add tags to own reviews" ON review_tags;
CREATE POLICY "Users can add tags to own reviews"
  ON review_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.user_id = auth.uid()
    )
  );

-- Users can remove tags from their own reviews
DROP POLICY IF EXISTS "Users can remove tags from own reviews" ON review_tags;
CREATE POLICY "Users can remove tags from own reviews"
  ON review_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.user_id = auth.uid()
    )
  );

-- Insert default tags
-- MOVED TO 20250309_insert_tags.sql for centralized tag management
/*
INSERT INTO tags (name, category) VALUES
  -- Course Conditions (using correct snake_case format)
  ('Fast Greens', 'course_conditions'),
  ('Slow Greens', 'course_conditions'),
  ('Well Maintained', 'course_conditions'),
  ('Needs Work', 'course_conditions'),
  -- Value
  ('Great Value', 'value'),
  ('Overpriced', 'value'),
  ('Hidden Gem', 'value'),
  -- Facilities
  ('Modern Clubhouse', 'facilities'),
  ('Friendly Staff', 'facilities'),
  ('Clean Facilities', 'facilities'),
  -- Playing Experience (replacing Difficulty with an allowed category)
  ('Beginner Friendly', 'playing_experience'),
  ('Challenging', 'playing_experience'),
  ('Tournament Ready', 'playing_experience')
ON CONFLICT (name, category) DO NOTHING;
*/ 