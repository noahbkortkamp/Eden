import { supabase } from './supabase';
import { User } from '../types/index';

/**
 * Follow a user
 * @param followerId The ID of the user doing the following
 * @param followingId The ID of the user being followed
 * @returns Promise<void>
 */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  // Prevent self-following
  if (followerId === followingId) {
    throw new Error("Cannot follow yourself");
  }

  try {
    // First check if already following
    const isAlreadyFollowing = await isFollowing(followerId, followingId);
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

/**
 * Get reviews from followed users
 * @param userId The ID of the user whose followed users' reviews to fetch
 * @param page Page number for pagination
 * @param limit Number of reviews per page
 * @returns Promise with reviews from followed users
 */
export async function getFriendsReviews(userId: string, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;
  
  // Request one extra item to determine if there are more pages
  const { data, error } = await supabase
    .from('followed_users_reviews')
    .select('*')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);  // Request one extra item to check if there are more

  if (error) {
    console.error("Error fetching friend reviews:", error);
    throw error;
  }

  return data || [];
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