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
  
  try {
    // First get the basic user data with a simpler query
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, username')
      .or(`full_name.ilike.%${query}%, username.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error("Error searching users:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }
    
    // Get review counts for each user individually
    const processedUsersPromises = data.map(async (user) => {
      try {
        const { count, error: countError } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        return {
          ...user,
          review_count: countError ? 0 : (count || 0)
        };
      } catch (e) {
        console.error(`Error getting review count for user ${user.id}:`, e);
        return {
          ...user,
          review_count: 0
        };
      }
    });
    
    try {
      // Wait for all the review count queries to complete
      const processedUsers = await Promise.all(processedUsersPromises);
      return processedUsers;
    } catch (e) {
      console.error("Error processing search results:", e);
      // Return users without review counts as fallback
      return data.map(user => ({
        ...user,
        review_count: 0
      }));
    }
  } catch (error) {
    console.error("Error in searchUsersByName:", error);
    return [];
  }
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
    console.log(`getFriendsReviews: Fetching reviews for user ${userId}, page ${page}, limit ${limit}`);
    // First fetch the reviews data
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
      console.log('No reviews found');
      return [];
    }

    // Get all the review IDs and course IDs for batch operations
    const reviewIds = reviewsData.map(review => review.id);
    const courseIds = reviewsData.map(review => review.course_id);
    const userIds = reviewsData.map(review => review.user_id);
    
    console.log(`Processing ${reviewIds.length} reviews`);
    
    // Run all queries in parallel for better performance
    const [likesData, bookmarksData, relativeScoresData] = await Promise.all([
      // Get likes data in a single query
      fetchLikesData(reviewIds, userId),
      
      // Get bookmarks data in a single query
      fetchBookmarksData(courseIds, userId),
      
      // Get relative scores for each user-course combination
      fetchRelativeScoresData(reviewsData)
    ]);
    
    // Process the reviews with interaction data
    const processedReviews = processReviewsWithInteractions(
      reviewsData, 
      likesData.likedReviewIds,
      likesData.likesCountMap,
      likesData.commentsCountMap,
      bookmarksData.bookmarkedCourseIds,
      relativeScoresData
    );
    
    console.log(`Processed ${processedReviews.length} reviews with interaction data`);
    return processedReviews;
  } catch (error) {
    console.error('Error in getFriendsReviews:', error);
    throw error;
  }
}

// Helper function to fetch likes and comments data
async function fetchLikesData(reviewIds: string[], userId: string) {
  try {
    // Check which reviews the current user has liked in a single query
    const { data: likedReviewsData, error: likedError } = await supabase
      .from('review_likes')
      .select('review_id')
      .eq('user_id', userId)
      .in('review_id', reviewIds);
      
    // Create a Set of liked review IDs for fast lookup
    const likedReviewIds = new Set((likedError || !likedReviewsData) ? [] : 
      likedReviewsData.map(item => item.review_id));
    
    // Fetch all likes for these reviews in a single query
    const { data: allLikesData, error: allLikesError } = await supabase
      .from('review_likes')
      .select('review_id')
      .in('review_id', reviewIds);
    
    // Count likes for each review manually
    const likesCountMap = new Map();
    if (!allLikesError && allLikesData) {
      // Count occurrences of each review_id
      allLikesData.forEach(item => {
        const reviewId = item.review_id;
        likesCountMap.set(reviewId, (likesCountMap.get(reviewId) || 0) + 1);
      });
    }
    
    // Fetch all comments for these reviews in a single query
    const { data: allCommentsData, error: allCommentsError } = await supabase
      .from('review_comments')
      .select('review_id')
      .in('review_id', reviewIds);
    
    // Count comments for each review manually
    const commentsCountMap = new Map();
    if (!allCommentsError && allCommentsData) {
      // Count occurrences of each review_id
      allCommentsData.forEach(item => {
        const reviewId = item.review_id;
        commentsCountMap.set(reviewId, (commentsCountMap.get(reviewId) || 0) + 1);
      });
    }
    
    return { likedReviewIds, likesCountMap, commentsCountMap };
  } catch (error) {
    console.error('Error fetching likes data:', error);
    // Return empty data structures as fallback
    return { 
      likedReviewIds: new Set(), 
      likesCountMap: new Map(),
      commentsCountMap: new Map()
    };
  }
}

// Helper function to fetch bookmarks data
async function fetchBookmarksData(courseIds: string[], userId: string) {
  try {
    // Check which courses the user has bookmarked
    const { data: bookmarkedData, error: bookmarkedError } = await supabase
      .from('want_to_play_courses')
      .select('course_id')
      .eq('user_id', userId)
      .in('course_id', courseIds);
      
    // Create a Set of bookmarked course IDs
    const bookmarkedCourseIds = new Set((bookmarkedError || !bookmarkedData) ? [] : 
      bookmarkedData.map(item => item.course_id));
    
    return { bookmarkedCourseIds };
  } catch (error) {
    console.error('Error fetching bookmarks data:', error);
    // Return empty data structure as fallback
    return { bookmarkedCourseIds: new Set() };
  }
}

// Helper function to fetch relative scores data
async function fetchRelativeScoresData(reviewsData: any[]) {
  try {
    // Create user-course pairs for the query
    const userCoursePairs = reviewsData.map(review => ({
      user_id: review.user_id,
      course_id: review.course_id
    }));
    
    // Fetch relative scores for each user-course combination
    const relativeScoresPromises = userCoursePairs.map(async ({ user_id, course_id }) => {
      const { data, error } = await supabase
        .from('course_rankings')
        .select('relative_score')
        .eq('user_id', user_id)
        .eq('course_id', course_id)
        .single();
      
      if (error || !data) {
        return { user_id, course_id, relative_score: null };
      }
      
      return { user_id, course_id, relative_score: data.relative_score };
    });
    
    const relativeScoresResults = await Promise.all(relativeScoresPromises);
    
    // Create a map using user_id + course_id as key
    const relativeScoresMap = new Map<string, number>();
    relativeScoresResults.forEach(({ user_id, course_id, relative_score }) => {
      if (relative_score !== null) {
        const key = `${user_id}-${course_id}`;
        relativeScoresMap.set(key, relative_score);
      }
    });
    
    console.log(`Fetched relative scores for ${relativeScoresMap.size} user-course combinations`);
    return relativeScoresMap;
  } catch (error) {
    console.error('Error fetching relative scores:', error);
    return new Map<string, number>();
  }
}

// Helper function to process reviews with interaction data
function processReviewsWithInteractions(
  reviewsData: any[],
  likedReviewIds: Set<string>,
  likesCountMap: Map<string, number>,
  commentsCountMap: Map<string, number>,
  bookmarkedCourseIds: Set<string>,
  relativeScoresMap: Map<string, number>
) {
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
    
    // Add interaction-specific properties from our pre-fetched data
    return {
      ...reviewWithoutBase,
      rating: finalRating,
      likes_count: likesCountMap.get(review.id) || 0,
      comments_count: commentsCountMap.get(review.id) || 0,
      is_liked_by_me: likedReviewIds.has(review.id),
      is_bookmarked: bookmarkedCourseIds.has(review.course_id),
      relative_score: relativeScoresMap.get(`${review.user_id}-${review.course_id}`)
    };
  });
  
  return processedReviews;
}

/**
 * Get people a user might want to follow based on recent activity
 * @param userId The user's ID
 * @param limit Maximum number of suggestions to return
 * @returns Promise<User[]>
 */
export async function getSuggestedUsers(userId: string, limit: number = 5): Promise<User[]> {
  try {
    console.log(`🔍 getSuggestedUsers: Starting search for user ${userId}, limit: ${limit}`);
    
    // Use the fallback method directly since the optimized query has issues with review counting
    return await getSuggestedUsersFallback(userId, limit);
  } catch (error) {
    console.error("Unexpected error in getSuggestedUsers:", error);
    return [];
  }
}

/**
 * Fallback method for getSuggestedUsers if the optimized query fails
 */
async function getSuggestedUsersFallback(userId: string, limit: number): Promise<User[]> {
  try {
    console.log("🔄 Using fallback method for getSuggestedUsers");
    
    // Get users the current user is already following to filter them out
    const { data: followingData, error: followingError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);
    
    const followingIds = followingError ? [] : (followingData || []).map(f => f.following_id);
    const followingSet = new Set(followingIds);
    console.log(`🔄 Fallback: User is following ${followingSet.size} users:`, Array.from(followingSet));
    
    // Get ALL users except self (remove any limit)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, username')
      .neq('id', userId);
    
    if (usersError || !users || users.length === 0) {
      console.error("Error getting users in fallback:", usersError);
      return [];
    }
    
    console.log(`🔄 Fallback: Found ${users.length} total users`);
    
    // Get review counts for ALL users in parallel
    const processedUsersPromises = users.map(async (user) => {
      try {
        const { count, error: countError } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        if (countError) {
          console.error(`Error getting review count for user ${user.full_name || user.username} (${user.id}):`, countError);
        }
        
        const reviewCount = countError ? 0 : (count || 0);
        
        // Log users with more than 1 review for debugging
        if (reviewCount > 1) {
          console.log(`🔄 Found user with ${reviewCount} reviews: ${user.full_name || user.username} (${user.id})`);
        }
        
        return {
          ...user,
          review_count: reviewCount
        };
      } catch (e) {
        console.error(`Exception getting review count for user ${user.id}:`, e);
        return {
          ...user,
          review_count: 0
        };
      }
    });
    
    const processedUsers = await Promise.all(processedUsersPromises);
    
    // Sort by review count (most reviews first)
    const sortedUsers = processedUsers.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    
    console.log(`🔄 Fallback: Top 20 users by review count:`);
    sortedUsers.slice(0, 20).forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.full_name || user.username}: ${user.review_count} reviews (ID: ${user.id})`);
    });
    
    // Filter out users the current user already follows
    const unfollowedUsers = sortedUsers.filter(user => !followingSet.has(user.id));
    
    console.log(`🔄 Fallback: After filtering followed users: ${unfollowedUsers.length} remaining`);
    console.log(`🔄 Fallback: Top 10 unfollowed users:`);
    unfollowedUsers.slice(0, 10).forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.full_name || user.username}: ${user.review_count} reviews (ID: ${user.id})`);
    });
    
    // Return up to the requested limit
    const result = unfollowedUsers.slice(0, limit);
    console.log(`🔄 Fallback: Final result - returning ${result.length} users:`);
    result.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.full_name || user.username}: ${user.review_count} reviews`);
    });
    
    return result;
  } catch (error) {
    console.error("Fallback method also failed:", error);
    return [];
  }
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

/**
 * Get the number of reviews posted by a user
 * @param userId The ID of the user
 * @returns Promise<number>
 */
export async function getUserReviewCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error getting user review count:", error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error("Unexpected error in getUserReviewCount:", error);
    return 0;
  }
} 