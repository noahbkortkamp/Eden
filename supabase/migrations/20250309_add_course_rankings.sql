-- Create enum for sentiment categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sentiment_category') THEN
    CREATE TYPE sentiment_category AS ENUM ('liked', 'fine', 'didnt_like');
  END IF;
END
$$;

-- Create course_rankings table
CREATE TABLE IF NOT EXISTS public.course_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    sentiment_category sentiment_category NOT NULL,
    relative_score DECIMAL(4,1) NOT NULL CHECK (relative_score >= 0 AND relative_score <= 10),
    rank_position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Create index for faster lookups
CREATE INDEX course_rankings_user_id_idx ON public.course_rankings(user_id);
CREATE INDEX course_rankings_sentiment_idx ON public.course_rankings(sentiment_category);

-- Enable Row Level Security
ALTER TABLE public.course_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own rankings
DROP POLICY IF EXISTS "Users can view their own rankings" ON public.course_rankings;
CREATE POLICY "Users can view their own rankings"
    ON public.course_rankings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can create their own rankings
DROP POLICY IF EXISTS "Users can insert their own rankings" ON public.course_rankings;
CREATE POLICY "Users can insert their own rankings"
    ON public.course_rankings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own rankings
DROP POLICY IF EXISTS "Users can update their own rankings" ON public.course_rankings;
CREATE POLICY "Users can update their own rankings"
    ON public.course_rankings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own rankings
DROP POLICY IF EXISTS "Users can delete their own rankings" ON public.course_rankings;
CREATE POLICY "Users can delete their own rankings"
    ON public.course_rankings FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updating updated_at column
DROP TRIGGER IF EXISTS update_course_rankings_updated_at ON public.course_rankings;
CREATE TRIGGER update_course_rankings_updated_at
    BEFORE UPDATE ON public.course_rankings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 