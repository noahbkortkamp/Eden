-- Add role field to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create admin role in Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
END
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for users table
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Users can read all users
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can manage all users
CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Update RLS policies for courses table
DROP POLICY IF EXISTS "Verified users can submit courses" ON courses;
DROP POLICY IF EXISTS "Allow authenticated create" ON courses;
DROP POLICY IF EXISTS "Allow authenticated update" ON courses;
DROP POLICY IF EXISTS "Allow authenticated delete" ON courses;

-- Courses are viewable by everyone
CREATE POLICY "Courses are viewable by everyone"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

-- Users can submit new courses
CREATE POLICY "Users can submit courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own courses
CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid())
  WITH CHECK (submitted_by = auth.uid());

-- Admins can manage all courses
CREATE POLICY "Admins can manage all courses"
  ON courses FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Update RLS policies for tags table
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON tags;

-- Tags are viewable by everyone
CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage tags
CREATE POLICY "Admins can manage tags"
  ON tags FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Update RLS policies for reviews table
DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;

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

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create admin user (replace with your admin email)
INSERT INTO users (id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'noah@golfculture.io'
ON CONFLICT (id) DO UPDATE
SET role = 'admin'; 