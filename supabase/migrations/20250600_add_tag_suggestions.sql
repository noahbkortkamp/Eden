-- Create tag_suggestions table
CREATE TABLE IF NOT EXISTS tag_suggestions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  tag_name text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE tag_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own tag suggestions
CREATE POLICY "Users can view their own tag suggestions"
  ON tag_suggestions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own tag suggestions
CREATE POLICY "Users can insert their own tag suggestions"
  ON tag_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()); 