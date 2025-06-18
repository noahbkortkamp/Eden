import { supabase } from './supabase';
import { Database } from './database.types';

type ReviewLike = Database['public']['Tables']['review_likes']['Row'];
type ReviewComment = Database['public']['Tables']['review_comments']['Row'];

// Function to like a review
export const likeReview = async (reviewId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('review_likes')
      .insert({ review_id: reviewId, user_id: userId });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error liking review:', error);
    throw error;
  }
};

// Function to unlike a review
export const unlikeReview = async (reviewId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('review_likes')
      .delete()
      .match({ review_id: reviewId, user_id: userId });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error unliking review:', error);
    throw error;
  }
};

// Function to toggle like status on a review
export const toggleLikeReview = async (reviewId: string, userId: string, currentlyLiked: boolean): Promise<void> => {
  try {
    if (currentlyLiked) {
      await unlikeReview(reviewId, userId);
    } else {
      await likeReview(reviewId, userId);
    }
  } catch (error) {
    console.error('Error toggling like on review:', error);
    throw error;
  }
};

// Function to check if a user has liked a review
export const hasUserLikedReview = async (reviewId: string, userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('review_likes')
      .select('id')
      .match({ review_id: reviewId, user_id: userId })
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned" error
    
    return !!data;
  } catch (error) {
    console.error('Error checking if user liked review:', error);
    return false;
  }
};

// Function to get likes count for a review
export const getReviewLikesCount = async (reviewId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('review_likes')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId);
    
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error getting review likes count:', error);
    return 0;
  }
};

// Function to get users who liked a review
export const getUsersWhoLikedReview = async (reviewId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('review_likes')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting users who liked review:', error);
    return [];
  }
};

// Function to add a comment to a review
export const addReviewComment = async (reviewId: string, userId: string, content: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('review_comments')
      .insert({ review_id: reviewId, user_id: userId, content })
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error adding comment to review:', error);
    throw error;
  }
};

// Function to get comments for a review
export const getReviewComments = async (reviewId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('review_comments')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting review comments:', error);
    return [];
  }
};

// Function to delete a comment
export const deleteReviewComment = async (commentId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('review_comments')
      .delete()
      .eq('id', commentId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting review comment:', error);
    throw error;
  }
};

// Function to update a comment
export const updateReviewComment = async (commentId: string, content: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('review_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating review comment:', error);
    throw error;
  }
}; 