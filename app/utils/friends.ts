import { supabase } from './supabase';
import { User } from '../types/index';

/**
 * Follow a user
 * @param followerId The ID of the user doing the following
 * @param followingId The ID of the user being followed
 * @returns Promise<void>
 */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  console.log(`Attempting to follow user: follower=${followerId}, following=${followingId}`);
  
  // Prevent self-following
  if (followerId === followingId) {
    console.error("Cannot follow yourself");
    throw new Error("Cannot follow yourself");
  }

  try {
    // First check if already following
    const isAlreadyFollowing = await isFollowing(followerId, followingId);
    console.log(`Already following check result: ${isAlreadyFollowing}`);
    
    if (isAlreadyFollowing) {
      console.log("Already following this user");
      return;
    }

    // If not already following, insert the new follow record
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId
      });

    if (error) {
      console.error("Error following user:", error);
      throw error;
    }
    
    console.log("Successfully followed user");
  } catch (err) {
    console.error("Unexpected error in followUser:", err);
    throw err;
  }
}

/**
 * Unfollow a user
 * @param followerId The ID of the user doing the unfollowing
 * @param followingId The ID of the user being unfollowed
 * @returns Promise<void>
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .match({
        follower_id: followerId,
        following_id: followingId
      });

    if (error) {
      console.error("Error unfollowing user:", error);
      throw error;
    }
  } catch (err) {
    console.error("Unexpected error in unfollowUser:", err);
    throw err;
  }
}

/**
 * Check if a user is following another user
 * @param followerId The ID of the user doing the following
 * @param followingId The ID of the user being followed
 * @returns Promise<boolean>
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (!followerId || !followingId) {
    console.warn("Missing user IDs in isFollowing check");
    return false;
  }

  try {
    // Instead of selecting 'id', just count records - we don't need any specific column
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .match({
        follower_id: followerId,
        following_id: followingId
      });

    if (error) {
      console.error("Error checking follow status:", error);
      // Don't throw error, just return false as default
      return false;
    }
    
    return count !== null && count > 0;
  } catch (err) {
    console.error("Unexpected error in isFollowing:", err);
    return false;
  }
}

/**
 * Get follows counts for a user
 * @param userId The user's ID
 * @returns Promise<{followers: number, following: number}>
 */
export async function getFollowCounts(userId: string): Promise<{followers: number, following: number}> {
  const [followersResponse, followingResponse] = await Promise.all([
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)
  ]);

  if (followersResponse.error) throw followersResponse.error;
  if (followingResponse.error) throw followingResponse.error;

  return {
    followers: followersResponse.count || 0,
    following: followingResponse.count || 0
  };
}

/**
 * Search for users by name
 * @param query The search query
 * @param limit Maximum number of results to return
 * @returns Promise<User[]>
 */
export async function searchUsersByName(query: string, limit: number = 10): Promise<User[]> {
  if (!query.trim()) return [];
  
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, username')
    .or(`full_name.ilike.%${query}%, username.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error("Error searching users:", error);
    throw error;
  }
  
  console.log("User search results:", data);
  return data || [];
}

// Helper function to convert sentiment to numeric rating
const sentimentToRating = (sentiment: string): number => {
  switch (sentiment) {
    case 'would_play_again':
      return 8.5;
    case 'it_was_fine':
      return 5.0;
    case 'would_not_play_again':
      return 2.0;
    default:
      return 5.0;
  }
};

// Sanitize review data to ensure consistent format
const sanitizeReview = (review: any) => {
  if (!review) return review;
  
  // Ensure created_at is in a consistent format
  if (review.created_at) {
    try {
      // Normalize date format
      const date = new Date(review.created_at);
      review.created_at = date.toISOString();
    } catch (e) {
      // If date parsing fails, keep original
      console.warn('Error parsing date:', review.created_at);
    }
  }
  
  // Ensure other fields exist
  return {
    ...review,
    id: review.id || `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    course_id: review.course_id || 'unknown',
    user_id: review.user_id || 'unknown',
  };
};

/**
 * Get reviews from followed users
 * @param userId The ID of the user whose followed users' reviews to fetch
 * @param page Page number for pagination
 * @param limit Number of reviews per page
 * @returns Promise with reviews from followed users
 */
export async function getFriendsReviews(userId: string, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;
  
  try {
    // First fetch the reviews data - no inner join with course_rankings
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('followed_users_reviews')
      .select('*')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reviewsError) {
      console.error('Error fetching friend reviews:', reviewsError);
      throw reviewsError;
    }

    if (!reviewsData || reviewsData.length === 0) {
      return [];
    }

    // Sanitize and normalize the review data
    const sanitizedReviews = reviewsData.map(review => {
      const sanitized = sanitizeReview(review);
      
      // First apply the basic sentiment-to-rating conversion
      // This handles cases like would_play_again, it_was_fine, would_not_play_again
      let baseRating = sentimentToRating(sanitized.sentiment);
      
      // Also map legacy sentiment values to the correct ranges
      if (sanitized.sentiment === 'liked') {
        baseRating = 8.5; // Same as would_play_again
      } else if (sanitized.sentiment === 'fine') {
        baseRating = 5.0; // Same as it_was_fine
      } else if (sanitized.sentiment === 'didnt_like') {
        baseRating = 2.0; // Same as would_not_play_again
      }
      
      return {
        ...sanitized,
        baseRating
      };
    });
    
    // Group by sentiment categories for position-based scoring
    const likedReviews = sanitizedReviews.filter(r => 
      r.sentiment === 'liked' || 
      r.sentiment === 'would_play_again' ||
      r.baseRating >= 7.0);
    
    const fineReviews = sanitizedReviews.filter(r => 
      r.sentiment === 'fine' || 
      r.sentiment === 'it_was_fine' ||
      (r.baseRating < 7.0 && r.baseRating >= 3.0));
    
    const didntLikeReviews = sanitizedReviews.filter(r => 
      r.sentiment === 'didnt_like' || 
      r.sentiment === 'would_not_play_again' ||
      r.baseRating < 3.0);
    
    // Process reviews with position-based scoring
    const processedReviews = sanitizedReviews.map(review => {
      let finalRating = review.baseRating; // Start with the base rating
      
      // Apply position-based scoring for "liked" reviews
      if (likedReviews.includes(review)) {
        const position = likedReviews.indexOf(review);
        const total = likedReviews.length;
        
        if (total === 1 || position === 0) {
          finalRating = 10.0; // Top "liked" course
        } else {
          // Scale from 7.0 to 10.0 based on position
          finalRating = 7.0 + ((10.0 - 7.0) * (total - position - 1) / Math.max(total - 1, 1));
        }
      } 
      // Apply position-based scoring for "fine" reviews
      else if (fineReviews.includes(review)) {
        const position = fineReviews.indexOf(review);
        const total = fineReviews.length;
        
        if (total === 1 || position === 0) {
          finalRating = 6.9; // Top "fine" course
        } else {
          // Scale from 3.0 to 6.9 based on position
          finalRating = 3.0 + ((6.9 - 3.0) * (total - position - 1) / Math.max(total - 1, 1));
        }
      }
      // Apply position-based scoring for "didnt_like" reviews
      else if (didntLikeReviews.includes(review)) {
        const position = didntLikeReviews.indexOf(review);
        const total = didntLikeReviews.length;
        
        if (total === 1 || position === 0) {
          finalRating = 2.9; // Top "didnt_like" course
        } else {
          // Scale from 0.0 to 2.9 based on position
          finalRating = 0.0 + ((2.9 - 0.0) * (total - position - 1) / Math.max(total - 1, 1));
        }
      }
      
      // Round to one decimal place for consistency
      finalRating = Math.round(finalRating * 10) / 10;
      
      // Remove the temporary baseRating property
      const { baseRating, ...reviewWithoutBase } = review;
      
      return {
        ...reviewWithoutBase,
        rating: finalRating
      };
    });
    
    return processedReviews;
  } catch (error) {
    console.error('Error in getFriendsReviews:', error);
    throw error;
  }
}

/**
 * Get people a user might want to follow based on recent activity
 * @param userId The user's ID
 * @param limit Maximum number of suggestions to return
 * @returns Promise<User[]>
 */
export async function getSuggestedUsers(userId: string, limit: number = 5): Promise<User[]> {
  // Get active users with recent reviews who the user is not already following
  const { data, error } = await supabase
    .rpc('get_suggested_users', { user_id: userId, max_suggestions: limit });

  if (error) {
    console.error("Error getting suggested users:", error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get users that a user follows
 * @param userId The ID of the user whose followed users to fetch
 * @returns Promise<User[]>
 */
export async function getFollowingUsers(userId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following_id,
      users:following_id (
        id,
        full_name,
        avatar_url,
        username
      )
    `)
    .eq('follower_id', userId);

  if (error) {
    console.error("Error fetching followed users:", error);
    throw error;
  }

  // Transform the data to match the User type
  return (data || []).map(follow => ({
    id: follow.users.id,
    username: follow.users.username || '',
    name: follow.users.full_name || '',
    profileImage: follow.users.avatar_url || undefined
  }));
} 