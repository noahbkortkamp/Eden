-- Create a function to get suggested users to follow based on activity
CREATE OR REPLACE FUNCTION get_suggested_users(user_id UUID, max_suggestions INT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Select users who:
  -- 1. Have posted reviews recently
  -- 2. Are not already followed by the current user
  -- 3. Are not the current user themselves
  SELECT DISTINCT u.id, u.full_name, u.avatar_url
  FROM users u
  JOIN reviews r ON u.id = r.user_id
  WHERE 
    -- Not the current user
    u.id != user_id
    -- Not already followed
    AND NOT EXISTS (
      SELECT 1 FROM follows f 
      WHERE f.follower_id = user_id AND f.following_id = u.id
    )
  -- Order by recent activity
  ORDER BY (
    SELECT MAX(created_at) FROM reviews 
    WHERE user_id = u.id
  ) DESC
  LIMIT max_suggestions;
END;
$$ LANGUAGE plpgsql; 