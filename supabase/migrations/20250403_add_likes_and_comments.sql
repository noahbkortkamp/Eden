-- Create likes table for reviews
CREATE TABLE IF NOT EXISTS review_likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Create comments table for reviews
CREATE TABLE IF NOT EXISTS review_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for likes
DROP POLICY IF EXISTS "Review likes are viewable by everyone" ON review_likes;
CREATE POLICY "Review likes are viewable by everyone"
  ON review_likes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage their own likes" ON review_likes;
CREATE POLICY "Users can manage their own likes"
  ON review_likes FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for comments
DROP POLICY IF EXISTS "Review comments are viewable by everyone" ON review_comments;
CREATE POLICY "Review comments are viewable by everyone"
  ON review_comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create their own comments" ON review_comments;
CREATE POLICY "Users can create their own comments"
  ON review_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own comments" ON review_comments;
CREATE POLICY "Users can update their own comments"
  ON review_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON review_comments;
CREATE POLICY "Users can delete their own comments"
  ON review_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable real-time for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE review_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE review_comments;

-- Create an index for faster retrieval
CREATE INDEX IF NOT EXISTS review_likes_review_id_idx ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS review_comments_review_id_idx ON review_comments(review_id); 