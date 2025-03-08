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
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own reviews
CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tags are viewable by everyone
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

-- Review tags are viewable by everyone
CREATE POLICY "Review tags are viewable by everyone"
  ON review_tags FOR SELECT
  TO authenticated
  USING (true);

-- Users can add tags to their own reviews
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
INSERT INTO tags (name, category) VALUES
  -- Course Conditions
  ('Fast Greens', 'Course Conditions'),
  ('Slow Greens', 'Course Conditions'),
  ('Well Maintained', 'Course Conditions'),
  ('Needs Work', 'Course Conditions'),
  -- Value
  ('Great Value', 'Value'),
  ('Overpriced', 'Value'),
  ('Hidden Gem', 'Value'),
  -- Facilities
  ('Modern Clubhouse', 'Facilities'),
  ('Friendly Staff', 'Facilities'),
  ('Clean Facilities', 'Facilities'),
  -- Difficulty
  ('Beginner Friendly', 'Difficulty'),
  ('Challenging', 'Difficulty'),
  ('Tournament Ready', 'Difficulty'); 