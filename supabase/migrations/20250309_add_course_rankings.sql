-- Create enum for sentiment categories
CREATE TYPE sentiment_category AS ENUM ('liked', 'fine', 'didnt_like');

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

-- Add RLS policies
ALTER TABLE public.course_rankings ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own rankings
CREATE POLICY "Users can view their own rankings"
    ON public.course_rankings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own rankings
CREATE POLICY "Users can insert their own rankings"
    ON public.course_rankings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own rankings
CREATE POLICY "Users can update their own rankings"
    ON public.course_rankings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own rankings
CREATE POLICY "Users can delete their own rankings"
    ON public.course_rankings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_course_rankings_updated_at
    BEFORE UPDATE ON public.course_rankings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 