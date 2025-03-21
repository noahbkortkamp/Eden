-- Migration to consolidate all bookmarked courses into a single table: want_to_play_courses

-- First ensure want_to_play_courses table exists with the correct structure
CREATE TABLE IF NOT EXISTS public.want_to_play_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  priority INTEGER DEFAULT 0,
  notes TEXT DEFAULT NULL,
  UNIQUE(user_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE public.want_to_play_courses ENABLE ROW LEVEL SECURITY;

-- Create policies for want_to_play_courses
DROP POLICY IF EXISTS "Users can view own bookmarked courses" ON public.want_to_play_courses;
CREATE POLICY "Users can view own bookmarked courses"
  ON public.want_to_play_courses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own bookmarked courses" ON public.want_to_play_courses;
CREATE POLICY "Users can manage own bookmarked courses"
  ON public.want_to_play_courses FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_want_to_play_courses_user_id ON public.want_to_play_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_want_to_play_courses_course_id ON public.want_to_play_courses(course_id);

-- Migrate data from saved_courses to want_to_play_courses
INSERT INTO public.want_to_play_courses (user_id, course_id, created_at)
SELECT user_id, course_id, created_at
FROM public.saved_courses
ON CONFLICT (user_id, course_id) 
DO UPDATE SET created_at = EXCLUDED.created_at
WHERE public.want_to_play_courses.created_at < EXCLUDED.created_at;

-- Migrate data from legacy want_to_play table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'want_to_play'
  ) THEN
    INSERT INTO public.want_to_play_courses (user_id, course_id, created_at)
    SELECT user_id, course_id, created_at
    FROM public.want_to_play
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET created_at = EXCLUDED.created_at
    WHERE public.want_to_play_courses.created_at < EXCLUDED.created_at;
  END IF;
END
$$;

-- We don't drop the old tables yet to ensure backward compatibility
-- They will be deprecated and can be dropped in a future migration after ensuring everything works 