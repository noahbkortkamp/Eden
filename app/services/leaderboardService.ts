import { supabase } from '../utils/supabase';

export interface LeaderboardUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  review_count: number;
  rank: number;
}

export const leaderboardService = {
  /**
   * Get top reviewers with 10+ reviews
   * Returns top 50 users ordered by review count
   */
  getTopReviewers: async (): Promise<LeaderboardUser[]> => {
    try {
      console.log('🏆 Fetching top reviewers for leaderboard...');

      // Use a more efficient approach: first get all users with any reviews
      // Then count reviews for each user and filter/sort client-side
      const { data: allUsersWithReviews, error } = await supabase
        .from('reviews')
        .select(`
          user_id,
          users!inner(
            id,
            full_name,
            avatar_url
          )
        `);

      if (error) {
        console.error('Error fetching leaderboard data:', error);
        throw error;
      }

      if (!allUsersWithReviews || allUsersWithReviews.length === 0) {
        console.log('No users with reviews found');
        return [];
      }

      // Count reviews per user
      const userReviewCounts = allUsersWithReviews.reduce((acc: Record<string, any>, row: any) => {
        const userId = row.user_id;
        const userData = row.users;
        
        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            full_name: userData.full_name,
            avatar_url: userData.avatar_url,
            review_count: 0
          };
        }
        
        acc[userId].review_count++;
        return acc;
      }, {});

      // Convert to array, filter for users with 10+ reviews, sort, and limit
      const qualifyingUsers = Object.values(userReviewCounts)
        .filter((user: any) => user.review_count >= 10)
        .sort((a: any, b: any) => {
          // Primary sort: review count (descending)
          if (b.review_count !== a.review_count) {
            return b.review_count - a.review_count;
          }
          // Secondary sort: name (ascending) for ties
          return (a.full_name || '').localeCompare(b.full_name || '');
        })
        .slice(0, 50) // Limit to top 50
        .map((user: any, index: number) => ({
          ...user,
          rank: index + 1
        }));

      console.log(`🏆 Found ${qualifyingUsers.length} qualifying users for leaderboard`);
      
      return qualifyingUsers as LeaderboardUser[];

    } catch (error) {
      console.error('Exception in getTopReviewers:', error);
      throw error;
    }
  },

  /**
   * Get the total count of users who qualify for the leaderboard (10+ reviews)
   * Useful for determining if we should show the leaderboard or empty state
   */
  getQualifyingUserCount: async (): Promise<number> => {
    try {
      console.log('📊 Checking count of qualifying users...');

      // Count reviews per user efficiently
      const { data, error } = await supabase
        .from('reviews')
        .select('user_id');

      if (error) {
        console.error('Error fetching qualifying user count:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      // Count reviews per user
      const userReviewCounts = data.reduce((acc: Record<string, number>, row: any) => {
        const userId = row.user_id;
        acc[userId] = (acc[userId] || 0) + 1;
        return acc;
      }, {});

      // Count users with 10+ reviews
      const qualifyingCount = Object.values(userReviewCounts)
        .filter((count: number) => count >= 10).length;

      console.log(`📊 Found ${qualifyingCount} users with 10+ reviews`);
      return qualifyingCount;

    } catch (error) {
      console.error('Exception in getQualifyingUserCount:', error);
      // Return 0 on error to show empty state safely
      return 0;
    }
  }
}; 