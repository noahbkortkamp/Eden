import { supabase } from '../utils/supabase';

export const userService = {
  /**
   * Update user metadata with first review completion
   * @deprecated Use markFirstReviewComplete instead
   */
  updateFirstReviewCompleted: async (userId: string): Promise<void> => {
    try {
      console.log(`📝 Updating first review completed status for user: ${userId}`);
      
      const { data, error } = await supabase.auth.updateUser({
        data: { 
          firstReviewCompleted: true,
          has_completed_first_review: true, // Add both flags for compatibility
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
   * Marks a user as having completed their first review
   */
  markFirstReviewComplete: async (userId: string): Promise<boolean> => {
    try {
      console.log(`📝 Marking first review as complete for user: ${userId}`);
      
      // Get current user data first
      const { data: userData } = await supabase.auth.getUser();
      console.log('Current user metadata:', userData?.user?.user_metadata);
      
      // Update the metadata
      const { data, error } = await supabase.auth.updateUser({
        data: { 
          has_completed_first_review: true,
          firstReviewCompleted: true, // Add both flags for compatibility
          firstReviewTimestamp: new Date().toISOString(),
          onboardingComplete: true // Ensure onboarding is marked as complete
        }
      });
      
      if (error) {
        console.error('Error marking first review as complete:', error);
        return false;
      }
      
      // Verify the update was successful by checking the metadata again
      const { data: verifyData } = await supabase.auth.getUser();
      const updatedMetadata = verifyData?.user?.user_metadata;
      
      // Check if flags were actually set
      const flagsSet = updatedMetadata?.has_completed_first_review === true && 
                       updatedMetadata?.firstReviewCompleted === true &&
                       updatedMetadata?.onboardingComplete === true;
      
      console.log('✅ Verification of first review completion flags:', {
        flagsSet,
        metadata: updatedMetadata
      });
      
      if (!flagsSet) {
        console.error('⚠️ Failed to set first review completion flags in metadata!', updatedMetadata);
        
        // Make one more attempt with direct API call
        try {
          const { data: retryData, error: retryError } = await supabase.auth.updateUser({
            data: { 
              has_completed_first_review: true,
              firstReviewCompleted: true,
              firstReviewTimestamp: new Date().toISOString(),
              onboardingComplete: true,
              _retry_flag_set: true // Add a flag to indicate this is a retry
            }
          });
          
          if (retryError) {
            console.error('⚠️ Retry also failed:', retryError);
          } else {
            console.log('✅ Retry successful:', retryData?.user?.user_metadata);
          }
        } catch (retryErr) {
          console.error('⚠️ Exception in retry:', retryErr);
        }
      }
      
      return true;
    } catch (err) {
      console.error('Exception marking first review as complete:', err);
      return false;
    }
  },
  
  /**
   * Check if user has completed their first review
   */
  hasCompletedFirstReview: async (userId: string): Promise<boolean> => {
    try {
      console.log(`🔍 Checking if user ${userId} has completed first review`);
      const { data } = await supabase.auth.getUser();
      
      if (!data || !data.user || !data.user.user_metadata) {
        console.log('❌ No user data or metadata found');
        return false;
      }
      
      // Check both possible metadata flags
      const hasCompleted = 
        !!data.user.user_metadata.has_completed_first_review || 
        !!data.user.user_metadata.firstReviewCompleted;
      
      console.log(`🔍 User first review status: ${hasCompleted}`, {
        metadata: data.user.user_metadata
      });
      
      return hasCompleted;
    } catch (err) {
      console.error('Error checking if user completed first review:', err);
      return false;
    }
  }
}; 