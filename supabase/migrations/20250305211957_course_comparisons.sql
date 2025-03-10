-- Create course_comparisons table
CREATE TABLE IF NOT EXISTS course_comparisons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) NOT NULL,
  preferred_course_id uuid REFERENCES courses(id) NOT NULL,
  other_course_id uuid REFERENCES courses(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_courses CHECK (preferred_course_id != other_course_id)
);

-- Enable Row Level Security
ALTER TABLE course_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Course comparisons are viewable by everyone
DROP POLICY IF EXISTS "Course comparisons are viewable by everyone" ON course_comparisons;
CREATE POLICY "Course comparisons are viewable by everyone"
  ON course_comparisons FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own comparisons
DROP POLICY IF EXISTS "Users can create own comparisons" ON course_comparisons;
CREATE POLICY "Users can create own comparisons"
  ON course_comparisons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comparisons
DROP POLICY IF EXISTS "Users can update own comparisons" ON course_comparisons;
CREATE POLICY "Users can update own comparisons"
  ON course_comparisons FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comparisons
DROP POLICY IF EXISTS "Users can delete own comparisons" ON course_comparisons;
CREATE POLICY "Users can delete own comparisons"
  ON course_comparisons FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id); 