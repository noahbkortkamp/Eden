-- Create a view to efficiently query followed users' reviews
CREATE OR REPLACE VIEW followed_users_reviews AS
SELECT 
    reviews.*,
    follows.follower_id,
    users.full_name,
    users.avatar_url,
    courses.name AS course_name,
    courses.location AS course_location
FROM reviews
JOIN follows ON reviews.user_id = follows.following_id
JOIN users ON reviews.user_id = users.id
JOIN courses ON reviews.course_id = courses.id;

-- Create an RLS policy for the view to ensure users can only see reviews from people they follow
CREATE POLICY "Users can view followed users reviews" 
  ON followed_users_reviews FOR SELECT 
  TO authenticated 
  USING (follower_id = auth.uid()); 