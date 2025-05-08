import { supabase } from '../utils/supabase';

export const userService = {
  /**
   * Update user metadata with first review completion
   */
  updateFirstReviewCompleted: async (userId: string): Promise<void> => {
    try {
      console.log(`📝 Updating first review completed status for user: ${userId}`);
      
      const { data, error } = await supabase.auth.updateUser({
        data: { 
          firstReviewCompleted: true,
          firstReviewTimestamp: new Date().toISOString()
        }
      });
      
      if (error) {
        console.error('Error updating user metadata:', error);
        throw error;
      }
      
      console.log('✅ Successfully updated user metadata for first review');
      return data;
    } catch (error) {
      console.error('Failed to update user metadata:', error);
      throw error;
    }
  },
  
  /**
   * Check if user has completed their first review
   */
  hasCompletedFirstReview: async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting user data:', error);
        return false;
      }
      
      // Check if the firstReviewCompleted flag exists in user metadata
      return !!data.user?.user_metadata?.firstReviewCompleted;
    } catch (error) {
      console.error('Error checking first review status:', error);
      return false;
    }
  }
}; 