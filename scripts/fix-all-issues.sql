-- COMPREHENSIVE FIX FOR GOLF REVIEW APP
-- This script addresses multiple issues:
-- 1. Creates a trigger to automatically create user profiles when users sign up
-- 2. Fixes schema inconsistencies in the reviews table
-- 3. Creates missing profiles for existing auth users
-- 4. Sets up appropriate RLS policies

-- Part 1: Create helper functions for diagnostics
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::boolean
  FROM 
    information_schema.columns
  WHERE 
    table_schema = 'public'
    AND table_name = $1
  ORDER BY 
    ordinal_position;
$$;

-- Function to check if a trigger exists
CREATE OR REPLACE FUNCTION public.does_trigger_exist(trigger_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = $1
  );
$$;

-- Part 2: Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  random_username TEXT;
BEGIN
  -- Generate a random username based on the timestamp
  random_username := 'user_' || substr(md5(random()::text), 1, 8);
  
  -- Insert a new record into public.users
  INSERT INTO public.users (id, username, full_name, created_at, updated_at)
  VALUES (
    NEW.id, 
    random_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Golf Enthusiast'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Part 3: Create or replace the trigger
DO $$
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Create the trigger
  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
END;
$$;

-- Part 4: Fix missing user profiles
CREATE OR REPLACE FUNCTION public.fix_missing_user_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  auth_user RECORD;
  created_count INTEGER := 0;
  random_username TEXT;
BEGIN
  -- Find auth users without corresponding public.users profiles
  FOR auth_user IN
    SELECT au.id, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- Generate a random username
    random_username := 'user_' || substr(md5(random()::text), 1, 8);
    
    -- Create the public user profile
    INSERT INTO public.users (id, username, full_name, created_at, updated_at)
    VALUES (
      auth_user.id,
      random_username,
      COALESCE(auth_user.raw_user_meta_data->>'full_name', 'Golf Enthusiast'),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Increment counter if a new profile was created
    IF FOUND THEN
      created_count := created_count + 1;
    END IF;
  END LOOP;
  
  -- Return number of profiles created
  RETURN created_count;
END;
$$;

-- Part 5: Create a test function for trigger behavior
CREATE OR REPLACE FUNCTION public.test_user_creation_trigger()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user_id UUID;
  test_user_exists BOOLEAN;
BEGIN
  -- Create a test user ID
  test_user_id := gen_random_uuid();
  
  -- Test the trigger behavior by directly calling the handler function
  PERFORM public.handle_new_user();
  
  -- Check if a test user was created in public.users
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = test_user_id
  ) INTO test_user_exists;
  
  -- Clean up the test user if created
  DELETE FROM public.users WHERE id = test_user_id;
  
  RETURN test_user_exists;
EXCEPTION 
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Part 6: Function to create a user profile directly
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id UUID, username TEXT DEFAULT NULL, full_name TEXT DEFAULT NULL)
RETURNS RECORD
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  random_username TEXT;
  result RECORD;
BEGIN
  -- Check if the user already exists
  SELECT * INTO result FROM public.users WHERE id = user_id;
  
  IF FOUND THEN
    RETURN result;
  END IF;
  
  -- Generate a random username if not provided
  IF username IS NULL THEN
    random_username := 'user_' || substr(md5(random()::text), 1, 8);
  ELSE
    random_username := username;
  END IF;
  
  -- Insert the new user profile
  INSERT INTO public.users (id, username, full_name, created_at, updated_at)
  VALUES (
    user_id,
    random_username,
    COALESCE(full_name, 'Golf Enthusiast'),
    NOW(),
    NOW()
  )
  RETURNING * INTO result;
  
  RETURN result;
END;
$$;

-- Part 7: RLS Policy adjustments for reviews table
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can select their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;

-- Create policies with proper checks
CREATE POLICY "Public can view reviews" 
ON public.reviews FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.reviews FOR DELETE 
USING (auth.uid() = user_id);

-- Part 8: Run the fix for existing users
SELECT public.fix_missing_user_profiles() AS profiles_created;

-- Step 3: Fix schema inconsistencies in the reviews table
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if sentiment column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'sentiment' AND table_schema = 'public'
  ) INTO column_exists;
  
  -- Add sentiment column if it doesn't exist
  IF NOT column_exists THEN
    ALTER TABLE public.reviews ADD COLUMN sentiment TEXT 
    GENERATED ALWAYS AS (
      CASE rating
        WHEN 'liked' THEN 'would_play_again'
        WHEN 'fine' THEN 'it_was_fine'
        WHEN 'didnt_like' THEN 'would_not_play_again'
        ELSE 'it_was_fine'
      END
    ) STORED;
    
    RAISE NOTICE 'Added sentiment column that maps to rating';
  END IF;
  
  -- Check if price_paid column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'price_paid' AND table_schema = 'public'
  ) INTO column_exists;
  
  -- Add price_paid if it doesn't exist
  IF NOT column_exists THEN
    ALTER TABLE public.reviews ADD COLUMN price_paid DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE 'Added price_paid column with default 0';
  END IF;
  
  -- Make non-essential columns nullable
  BEGIN
    ALTER TABLE public.reviews ALTER COLUMN date_played DROP NOT NULL;
    RAISE NOTICE 'Made date_played column nullable';
  EXCEPTION
    WHEN undefined_column THEN
      RAISE NOTICE 'date_played column already nullable or does not exist';
  END;
  
  BEGIN
    ALTER TABLE public.reviews ALTER COLUMN sentiment DROP NOT NULL;
    RAISE NOTICE 'Made sentiment column nullable';
  EXCEPTION
    WHEN undefined_column THEN
      RAISE NOTICE 'sentiment column already nullable or does not exist';
  END;
  
  BEGIN
    ALTER TABLE public.reviews ALTER COLUMN price_paid DROP NOT NULL;
    RAISE NOTICE 'Made price_paid column nullable';
  EXCEPTION
    WHEN undefined_column THEN
      RAISE NOTICE 'price_paid column already nullable or does not exist';
  END;
END
$$;

-- Step 7: Force a schema refresh to ensure changes take effect
NOTIFY pgrst, 'reload schema';

-- Output the current state of the reviews table for verification
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'reviews' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Output the current RLS policies for the reviews table
SELECT * FROM pg_policies WHERE tablename = 'reviews';

-- Output the first 5 auth users
SELECT id, email, created_at
FROM auth.users
LIMIT 5;

-- Output the first 5 user profiles
SELECT id, username, full_name, created_at
FROM public.users
LIMIT 5; 