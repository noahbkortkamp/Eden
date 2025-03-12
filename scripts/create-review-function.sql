-- create-review-function.sql
-- Creates a robust function for creating reviews that ensures users have profiles

CREATE OR REPLACE FUNCTION public.create_user_review(
  p_user_id UUID,
  p_course_id UUID,
  p_rating TEXT,
  p_date_played TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL,
  p_favorite_holes INT[] DEFAULT NULL,
  p_photos TEXT[] DEFAULT NULL,
  p_price_paid DECIMAL DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sentiment TEXT;
  v_user_exists BOOLEAN;
  v_course_exists BOOLEAN;
  v_random_username TEXT;
  v_review_id UUID;
  v_result JSONB;
BEGIN
  -- Map rating to sentiment
  CASE p_rating
    WHEN 'liked' THEN v_sentiment := 'would_play_again';
    WHEN 'fine' THEN v_sentiment := 'it_was_fine';
    WHEN 'didnt_like' THEN v_sentiment := 'would_not_play_again';
    ELSE v_sentiment := 'it_was_fine';
  END CASE;
  
  -- Check if user exists in public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE id = p_user_id
  ) INTO v_user_exists;
  
  -- If user doesn't exist, create a profile
  IF NOT v_user_exists THEN
    -- Generate random username
    v_random_username := 'user_' || substr(md5(random()::text), 1, 8);
    
    -- Insert user profile
    INSERT INTO public.users (
      id, 
      username, 
      full_name,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_random_username,
      'Golf Enthusiast',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
  
  -- Check if course exists
  SELECT EXISTS(
    SELECT 1 FROM public.courses WHERE id = p_course_id
  ) INTO v_course_exists;
  
  IF NOT v_course_exists THEN
    RAISE EXCEPTION 'Course with ID % does not exist', p_course_id;
  END IF;
  
  -- Create the review
  INSERT INTO public.reviews (
    user_id,
    course_id,
    rating,
    sentiment,
    notes,
    favorite_holes,
    photos,
    date_played,
    price_paid,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_course_id,
    p_rating,
    v_sentiment,
    p_notes,
    p_favorite_holes,
    p_photos,
    p_date_played,
    p_price_paid,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_review_id;
  
  -- Get the complete review to return
  SELECT jsonb_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'course_id', r.course_id,
    'rating', r.rating,
    'sentiment', r.sentiment,
    'notes', r.notes,
    'favorite_holes', r.favorite_holes,
    'photos', r.photos,
    'date_played', r.date_played,
    'price_paid', r.price_paid,
    'created_at', r.created_at,
    'updated_at', r.updated_at
  )
  FROM public.reviews r
  WHERE r.id = v_review_id
  INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Try a minimal insert as a last resort
    BEGIN
      INSERT INTO public.reviews (
        user_id,
        course_id,
        rating,
        date_played,
        created_at,
        updated_at
      ) VALUES (
        p_user_id,
        p_course_id,
        p_rating,
        p_date_played,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_review_id;
      
      SELECT jsonb_build_object(
        'id', r.id,
        'user_id', r.user_id,
        'course_id', r.course_id,
        'rating', r.rating,
        'date_played', r.date_played,
        'created_at', r.created_at,
        'updated_at', r.updated_at
      )
      FROM public.reviews r
      WHERE r.id = v_review_id
      INTO v_result;
      
      RETURN v_result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create review: %', SQLERRM;
    END;
END;
$$; 