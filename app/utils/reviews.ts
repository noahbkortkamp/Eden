import { supabase } from './supabase';
import { Database } from './database.types';

type Review = Database['public']['Tables']['reviews']['Row'];
type Tag = Database['public']['Tables']['tags']['Row'];

export async function createReview(
  userId: string,
  courseId: string,
  rating: 'liked' | 'fine' | 'didnt_like',
  notes: string | null,
  favoriteHoles: number[] | { number: number; reason: string }[],
  photos: string[],
  datePlayed: string,
  tagIds: string[],
  playingPartners: string[] = []
): Promise<Review> {
  // Format favorite holes to be just an array of numbers
  const formattedFavoriteHoles = Array.isArray(favoriteHoles) 
    ? favoriteHoles.map(hole => typeof hole === 'number' ? hole : hole.number)
    : [];

  // Map app rating to database sentiment value
  let sentiment;
  switch(rating) {
    case 'liked':
      sentiment = 'would_play_again';
      break;
    case 'fine':
      sentiment = 'it_was_fine';
      break;
    case 'didnt_like':
      sentiment = 'would_not_play_again';
      break;
    default:
      sentiment = 'it_was_fine';
  }

  console.log('Creating review with data:', {
    userId,
    courseId,
    rating,
    sentiment, // Log the mapped sentiment
    notes,
    favoriteHoles: formattedFavoriteHoles,
    photos: photos.length + ' photos',
    datePlayed,
    tagIds,
    playingPartners: playingPartners.length + ' partners',
  });

  try {
    // ENHANCED USER PROFILE CHECK - First verify the user has a profile in the public.users table
    let userProfileExists = false;
    
    // Check if the user profile exists
    try {
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          console.log('No user profile found, will create one...');
        } else {
          console.warn('Error checking user profile:', userError);
          // Continue anyway, as we'll try to create a profile below
        }
      } else if (userProfile) {
        console.log('Found existing user profile for', userId);
        userProfileExists = true;
      }
    } catch (checkError) {
      console.warn('Error during user profile check:', checkError);
      // Continue with attempt to create profile
    }

    // Create user profile if it doesn't exist
    if (!userProfileExists) {
      console.log('Creating user profile for', userId);
      try {
        // Retry up to 3 times with exponential backoff
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const randomUsername = `user_${Math.random().toString(36).substring(2, 10)}`;
            const { data: createdProfile, error: insertError } = await supabase
              .from('users')
              .insert({
                id: userId,
                username: randomUsername,
                full_name: 'Golf Enthusiast',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
              
            if (insertError) {
              if (insertError.code === '23505') { // Duplicate key error
                console.log('Profile already exists (race condition)');
                userProfileExists = true;
                break;
              } else {
                console.warn(`Profile creation attempt ${attempt} failed:`, insertError);
                if (attempt < 3) {
                  const delay = Math.pow(2, attempt) * 500; // Exponential backoff
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
            } else {
              console.log('Successfully created user profile:', createdProfile);
              userProfileExists = true;
              break;
            }
          } catch (insertAttemptError) {
            console.warn(`Profile creation attempt ${attempt} exception:`, insertAttemptError);
            if (attempt < 3) {
              const delay = Math.pow(2, attempt) * 500; // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
      } catch (profileError) {
        console.warn('All profile creation attempts failed:', profileError);
        // Continue anyway as the database trigger might handle this
      }
    }

    // Verify course exists
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Failed to verify course:', courseError);
      throw new Error(`Course not found or error: ${courseError.message}`);
    }

    // Verify that all tags exist
    if (tagIds && tagIds.length > 0) {
      const { data: existingTags, error: tagCheckError } = await supabase
        .from('tags')
        .select('id')
        .in('id', tagIds);

      if (tagCheckError) {
        console.error('Failed to check tags:', tagCheckError);
        throw tagCheckError;
      }

      const foundTagIds = new Set(existingTags.map(tag => tag.id));
      const missingTags = tagIds.filter(id => !foundTagIds.has(id));

      if (missingTags.length > 0) {
        console.warn('Some tags do not exist and will be skipped:', missingTags);
        // Filter out the missing tags instead of failing
        tagIds = tagIds.filter(id => foundTagIds.has(id));
      }
    }

    // Create the review with all supported fields
    const reviewData = {
      user_id: userId,
      course_id: courseId,
      rating, // Keep original rating
      sentiment, // Add mapped sentiment value
      notes,
      favorite_holes: formattedFavoriteHoles,
      photos,
      date_played: datePlayed,
      price_paid: 0, // Default value, can be updated later
      playing_partners: playingPartners, // Add playing partners
    };

    // Try to create the review - progressive fallback approach
    let review;
    try {
      // First attempt - with all fields
      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select()
        .single();
        
      if (error) {
        console.warn('Full review insert failed:', error);
        throw error;
      }
      review = data;
      console.log('Successfully created review with all fields');
    } catch (initialError) {
      console.warn('Initial review insert failed, trying with minimal fields:', initialError);
      
      // Second attempt - fallback to minimal required fields
      try {
        const minimalData = {
          user_id: userId,
          course_id: courseId,
          rating,
          sentiment,
          date_played: datePlayed
        };
        
        const { data, error } = await supabase
          .from('reviews')
          .insert(minimalData)
          .select()
          .single();
          
        if (error) {
          console.error('Minimal review insert failed:', error);
          throw error;
        }
        review = data;
        console.log('Created review with minimal fields');
      } catch (fallbackError) {
        // Final attempt - try executing the stored function
        console.warn('All standard insert attempts failed, trying RPC fallback:', fallbackError);
        try {
          const { data, error } = await supabase.rpc('create_user_review', {
            p_user_id: userId,
            p_course_id: courseId,
            p_rating: rating,
            p_date_played: datePlayed
          });
          
          if (error) {
            console.error('RPC review creation failed:', error);
            throw error;
          }
          
          if (data) {
            review = typeof data === 'string' ? JSON.parse(data) : data;
            console.log('Created review via RPC function');
          } else {
            throw new Error('RPC returned no data');
          }
        } catch (rpcError) {
          console.error('All review insert attempts failed:', rpcError);
          throw new Error(`Failed to create review after multiple attempts: ${rpcError.message}`);
        }
      }
    }
    
    if (!review) {
      throw new Error('Failed to create review: No review data returned');
    }

    // Create tag relationships if there are any tags
    if (tagIds && tagIds.length > 0 && review) {
      try {
        const reviewTags = tagIds.map(tagId => ({
          review_id: review.id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('review_tags')
          .insert(reviewTags);

        if (tagError) {
          console.warn('Failed to add review tags:', tagError);
          // Continue anyway as the review was created successfully
        }
      } catch (tagError) {
        console.warn('Error adding tags, but review was created:', tagError);
      }
    }

    return review;
  } catch (error) {
    console.error('Detailed error creating review:', error);
    throw error;
  }
}

export async function updateReview(
  reviewId: string,
  userId: string,
  updates: {
    rating?: 'liked' | 'fine' | 'didnt_like';
    notes?: string | null;
    favoriteHoles?: number[];
    photos?: string[];
    datePlayed?: string;
    tagIds?: string[];
    playingPartners?: string[];
  }
): Promise<Review> {
  const { rating, notes, favoriteHoles, photos, datePlayed, tagIds, playingPartners } = updates;

  // If rating is updated, map it to the corresponding sentiment
  let sentiment;
  if (rating) {
    switch(rating) {
      case 'liked':
        sentiment = 'would_play_again';
        break;
      case 'fine':
        sentiment = 'it_was_fine';
        break;
      case 'didnt_like':
        sentiment = 'would_not_play_again';
        break;
      default:
        sentiment = 'it_was_fine';
    }
  }

  // Include both rating and sentiment in the update
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .update({
      rating,
      sentiment, // Add mapped sentiment value
      notes,
      favorite_holes: favoriteHoles,
      photos,
      date_played: datePlayed,
      playing_partners: playingPartners,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .eq('user_id', userId)
    .select()
    .single();

  if (reviewError) throw reviewError;

  if (tagIds) {
    // Delete existing tags
    const { error: deleteError } = await supabase
      .from('review_tags')
      .delete()
      .eq('review_id', reviewId);

    if (deleteError) throw deleteError;

    // Insert new tags
    if (tagIds.length > 0) {
      const reviewTags = tagIds.map(tagId => ({
        review_id: reviewId,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from('review_tags')
        .insert(reviewTags);

      if (tagError) throw tagError;
    }
  }

  return review;
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getReview(reviewId: string): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (error) throw error;
  return data;
}

export async function getReviewsForCourse(courseId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getReviewTags(reviewId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('review_tags')
    .select('tags:tag_id(*)')
    .eq('review_id', reviewId);

  if (error) throw error;
  return data.map(item => item.tags);
}

export async function getAllTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getTagsByCategory(category: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('category', category)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
} 