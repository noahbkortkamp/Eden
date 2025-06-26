-- Create course_submissions table
CREATE TABLE IF NOT EXISTS course_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  user_email text,
  course_name text NOT NULL,
  state text NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE course_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own course submissions
CREATE POLICY "Users can view their own course submissions"
  ON course_submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own course submissions
CREATE POLICY "Users can insert their own course submissions"
  ON course_submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all course submissions (optional, for admin panel)
-- CREATE POLICY "Admins can view all course submissions"
--   ON course_submissions FOR ALL
--   TO authenticated
--   USING (auth.jwt() ->> 'role' = 'admin');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS course_submissions_user_id_idx ON course_submissions(user_id);
CREATE INDEX IF NOT EXISTS course_submissions_status_idx ON course_submissions(status);
CREATE INDEX IF NOT EXISTS course_submissions_created_at_idx ON course_submissions(created_at DESC); 