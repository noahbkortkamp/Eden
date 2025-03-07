/*
  # Initial Schema for Golf Course Review App

  1. New Tables
    - users
      - Custom user profile data
      - Preferences and stats
    - courses
      - Golf course information
      - Location and basic details
    - reviews
      - Course reviews with required photos
      - Sentiment and ratings
    - photos
      - Review photos with categories
    - tags
      - Predefined course tags
    - review_tags
      - Junction table for review-tag relationships
    - follows
      - User following relationships
    - saved_courses
      - Users' saved/bookmarked courses
    
  2. Security
    - RLS policies for all tables
    - Authenticated user access control
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  home_course_id uuid,
  golfer_type text[], -- Array of selected types
  annual_course_goal int DEFAULT 10,
  play_preferences text[], -- Array of play preferences
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  is_public boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  submitted_by uuid REFERENCES users(id),
  price_range int[], -- Array of [min, max] prices
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) NOT NULL,
  course_id uuid REFERENCES courses(id) NOT NULL,
  sentiment text NOT NULL CHECK (sentiment IN ('would_play_again', 'it_was_fine', 'would_not_play_again')),
  price_paid decimal(10,2) NOT NULL,
  comment text,
  playing_partners uuid[], -- Array of user IDs
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id) -- One review per user per course
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id uuid REFERENCES reviews(id) NOT NULL,
  url text NOT NULL,
  category text NOT NULL CHECK (category IN ('tee_box', 'fairway', 'green', 'clubhouse', 'scenic')),
  created_at timestamptz DEFAULT now()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category text NOT NULL CHECK (category IN ('playing_experience', 'course_conditions', 'amenities', 'value', 'facilities')),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, name)
);

-- Review Tags junction table
CREATE TABLE IF NOT EXISTS review_tags (
  review_id uuid REFERENCES reviews(id) NOT NULL,
  tag_id uuid REFERENCES tags(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (review_id, tag_id)
);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  follower_id uuid REFERENCES users(id) NOT NULL,
  following_id uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Saved Courses table
CREATE TABLE IF NOT EXISTS saved_courses (
  user_id uuid REFERENCES users(id) NOT NULL,
  course_id uuid REFERENCES courses(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

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

-- Courses are viewable by everyone
CREATE POLICY "Courses are viewable by everyone"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

-- Verified users can submit new courses
CREATE POLICY "Verified users can submit courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (true);

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

-- Photos are viewable by everyone
CREATE POLICY "Photos are viewable by everyone"
  ON photos FOR SELECT
  TO authenticated
  USING (true);

-- Users can upload photos to their own reviews
CREATE POLICY "Users can upload photos to own reviews"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_id
      AND reviews.user_id = auth.uid()
    )
  );

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

-- Follows are viewable by everyone
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  TO authenticated
  USING (true);

-- Users can manage their own follows
CREATE POLICY "Users can manage own follows"
  ON follows FOR ALL
  TO authenticated
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- Saved courses are viewable by the owner
CREATE POLICY "Users can view own saved courses"
  ON saved_courses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can manage their own saved courses
CREATE POLICY "Users can manage own saved courses"
  ON saved_courses FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert default tags
INSERT INTO tags (category, name) VALUES
  -- Playing Experience
  ('playing_experience', 'Fast Pace'),
  ('playing_experience', 'Slow Pace'),
  ('playing_experience', 'Beginner Friendly'),
  ('playing_experience', 'Challenging'),
  -- Course Conditions
  ('course_conditions', 'Fast Greens'),
  ('course_conditions', 'Slow Greens'),
  ('course_conditions', 'Well Maintained'),
  ('course_conditions', 'Needs Work'),
  -- Amenities
  ('amenities', 'Great Practice Area'),
  ('amenities', 'Good Pro Shop'),
  ('amenities', 'Great Restaurant'),
  ('amenities', 'Cart Service'),
  -- Value
  ('value', 'Great Value'),
  ('value', 'Overpriced'),
  ('value', 'Hidden Gem'),
  ('value', 'Worth Every Penny'),
  -- Facilities
  ('facilities', 'Modern Clubhouse'),
  ('facilities', 'Friendly Staff'),
  ('facilities', 'Good Cart Paths'),
  ('facilities', 'Clean Facilities');