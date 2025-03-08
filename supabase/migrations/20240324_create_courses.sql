-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    par INTEGER NOT NULL,
    yardage INTEGER NOT NULL,
    price_level INTEGER NOT NULL CHECK (price_level BETWEEN 1 AND 5),
    type TEXT NOT NULL CHECK (type IN ('public', 'private', 'resort', 'semi-private')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    website TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access"
    ON public.courses
    FOR SELECT
    TO public
    USING (true);

-- Create policy to allow authenticated users to insert courses
CREATE POLICY "Allow authenticated create"
    ON public.courses
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create policy to allow authenticated users to update their courses
CREATE POLICY "Allow authenticated update"
    ON public.courses
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create policy to allow authenticated users to delete their courses
CREATE POLICY "Allow authenticated delete"
    ON public.courses
    FOR DELETE
    TO authenticated
    USING (true); 