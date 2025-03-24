-- Create a new policy to allow users to view course rankings from people they follow
CREATE POLICY "Users can view rankings from followed users" 
  ON course_rankings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM follows 
      WHERE follows.follower_id = auth.uid()
      AND follows.following_id = course_rankings.user_id
    )
  );

-- Create a secure function to bypass RLS and get course rankings by IDs
CREATE OR REPLACE FUNCTION get_course_ranking_by_ids(user_id_param UUID, course_id_param UUID)
RETURNS SETOF course_rankings
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM course_rankings 
  WHERE user_id = user_id_param AND course_id = course_id_param;
$$; 