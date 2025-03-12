# User Profile and Review Submission Fix Scripts

These scripts address issues with user profiles and review submissions in the Golf Course Review application.

## The Problem

The application uses Supabase Auth for authentication, but reviews require a user profile in the `public.users` table with a matching ID. When users sign up through Auth, a corresponding profile entry in the `public.users` table isn't always created automatically, causing review submissions to fail.

## Fix Options

There are several ways to fix this issue. You can pick the one that works best for you:

### Option 1: Run the All-In-One SQL Script (Recommended)

1. Open the Supabase SQL Editor
2. Copy and paste the contents of `fix-all-issues.sql`
3. Click "Run" to execute the script
4. Restart your application

This script:
- Creates helper diagnostic functions
- Sets up the user creation trigger
- Fixes missing profiles for existing users
- Adjusts RLS policies

### Option 2: Run the Node.js Script

If you prefer a more interactive approach:

1. Run `npm install @supabase/supabase-js dotenv` (if not already installed)
2. Update your `.env` file with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the script: `node scripts/fix-user-profiles.js`

This script:
- Finds users with missing profiles
- Creates the missing profiles
- Sets up the trigger for future users

### Option 3: Create a User Review Function

For enhanced resilience:

1. Open the Supabase SQL Editor
2. Copy and paste the contents of `create-review-function.sql`
3. Click "Run" to execute the script

This creates a server-side function that ensures user profiles exist before creating reviews.

### Option 4: Test Database Connectivity

To diagnose issues with your database setup:

1. Run `npm install @supabase/supabase-js dotenv` (if not already installed)
2. Run `node scripts/test-connectivity.js`

This will:
- Test connection to your database
- Check for required tables
- Test user profile creation
- Verify trigger setup

## Manual Fix Process

If you need to manually fix things:

### 1. Check for Missing User Profiles

```sql
-- Find auth users without profiles
SELECT au.id, au.email 
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

### 2. Create Missing Profiles

```sql
-- For each missing user
INSERT INTO public.users (id, username, full_name, created_at, updated_at)
VALUES (
  'user-id-here', 
  'username_' || substr(md5(random()::text), 1, 8),
  'Golf Enthusiast',
  NOW(),
  NOW()
);
```

### 3. Set Up the Trigger

```sql
-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  random_username TEXT;
BEGIN
  random_username := 'user_' || substr(md5(random()::text), 1, 8);
  
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

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

## Next Steps

After applying one of these fixes:

1. Restart your application
2. Try submitting a review again
3. Check app logs for any errors
4. If problems persist, try checking RLS policies 