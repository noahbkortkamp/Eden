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
  tagIds: string[]
): Promise<Review> {
  // Format favorite holes to be just an array of numbers
  const formattedFavoriteHoles = Array.isArray(favoriteHoles) 
    ? favoriteHoles.map(hole => typeof hole === 'number' ? hole : hole.number)
    : [];

  console.log('Creating review with data:', {
    userId,
    courseId,
    rating,
    notes,
    favoriteHoles: formattedFavoriteHoles,
    photos: photos.length + ' photos',
    datePlayed,
    tagIds,
  });

  try {
    // First verify that all tags exist
    if (tagIds.length > 0) {
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
        console.error('Some tags do not exist:', missingTags);
        throw new Error(`Tags not found: ${missingTags.join(', ')}`);
      }
    }

    // Create the review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
        course_id: courseId,
        rating,
        notes,
        favorite_holes: formattedFavoriteHoles,
        photos,
        date_played: datePlayed,
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Failed to create review:', reviewError);
      throw reviewError;
    }

    // Create tag relationships if there are any tags
    if (tagIds.length > 0) {
      const reviewTags = tagIds.map(tagId => ({
        review_id: review.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from('review_tags')
        .insert(reviewTags);

      if (tagError) {
        console.error('Failed to add review tags:', tagError);
        throw tagError;
      }
    }

    return review;
  } catch (error) {
    console.error('Detailed error:', error);
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
  }
): Promise<Review> {
  const { rating, notes, favoriteHoles, photos, datePlayed, tagIds } = updates;

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .update({
      rating,
      notes,
      favorite_holes: favoriteHoles,
      photos,
      date_played: datePlayed,
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