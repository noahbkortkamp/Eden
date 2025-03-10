-- Add indexes for frequently queried fields in reviews table
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_date_played ON reviews(date_played);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Add indexes for course comparisons table
CREATE INDEX IF NOT EXISTS idx_course_comparisons_user_id ON course_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_course_comparisons_preferred_course ON course_comparisons(preferred_course_id);
CREATE INDEX IF NOT EXISTS idx_course_comparisons_other_course ON course_comparisons(other_course_id);
CREATE INDEX IF NOT EXISTS idx_course_comparisons_created_at ON course_comparisons(created_at DESC);

-- Add indexes for courses table
CREATE INDEX IF NOT EXISTS idx_courses_location ON courses(location);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reviews_user_date ON reviews(user_id, date_played DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_course_date ON reviews(course_id, date_played DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_user_courses ON course_comparisons(user_id, preferred_course_id, other_course_id);

-- Add indexes for full-text search on course names and locations
CREATE INDEX IF NOT EXISTS idx_courses_name_trgm ON courses USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courses_location_trgm ON courses USING gin(location gin_trgm_ops); 