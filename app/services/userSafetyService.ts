import { supabase } from '../utils/supabase';

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: 'review' | 'comment' | 'user_profile';
  content_id: string;
  reason: 'inappropriate' | 'spam' | 'harassment' | 'fake' | 'hate_speech' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  created_at: string;
}

class UserSafetyService {
  
  // === USER BLOCKING ===
  
  /**
   * Block a user
   */
  async blockUser(blockedUserId: string): Promise<boolean> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      if (currentUser.user.id === blockedUserId) {
        throw new Error('Cannot block yourself');
      }

      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUser.user.id,
          blocked_id: blockedUserId
        });

      if (error) {
        // Check if it's a duplicate block (user already blocked)
        if (error.code === '23505') { // PostgreSQL unique violation
          console.log('User already blocked');
          return true; // Consider it successful since the desired state is achieved
        }
        throw error;
      }

      console.log('✅ User blocked successfully');
      return true;
    } catch (error) {
      console.error('❌ Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockedUserId: string): Promise<boolean> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUser.user.id)
        .eq('blocked_id', blockedUserId);

      if (error) {
        throw error;
      }

      console.log('✅ User unblocked successfully');
      return true;
    } catch (error) {
      console.error('❌ Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return false;
      }

      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', currentUser.user.id)
        .eq('blocked_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('❌ Error checking if user is blocked:', error);
      return false;
    }
  }

  /**
   * Get list of blocked users for management
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          id,
          blocker_id,
          blocked_id,
          created_at,
          blocked_user:profiles!blocked_users_blocked_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('blocker_id', currentUser.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching blocked users:', error);
      throw error;
    }
  }

  // === CONTENT REPORTING ===

  /**
   * Report content for manual review
   */
  async reportContent(
    contentType: 'review' | 'comment' | 'user_profile',
    contentId: string,
    reason: 'inappropriate' | 'spam' | 'harassment' | 'fake' | 'hate_speech' | 'other',
    description?: string
  ): Promise<boolean> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: currentUser.user.id,
          content_type: contentType,
          content_id: contentId,
          reason: reason,
          description: description
        });

      if (error) {
        // Check if it's a duplicate report
        if (error.code === '23505') {
          throw new Error('You have already reported this content');
        }
        throw error;
      }

      console.log('✅ Content reported successfully');
      return true;
    } catch (error) {
      console.error('❌ Error reporting content:', error);
      throw error;
    }
  }

  /**
   * Get user's own reports (for transparency)
   */
  async getUserReports(): Promise<ContentReport[]> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('reporter_id', currentUser.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching user reports:', error);
      throw error;
    }
  }

  // === HELPER METHODS FOR FILTERING CONTENT ===

  /**
   * Get list of blocked user IDs for filtering queries
   */
  async getBlockedUserIds(): Promise<string[]> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return [];
      }

      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', currentUser.user.id);

      if (error) {
        console.error('❌ Error fetching blocked user IDs:', error);
        return [];
      }

      return data?.map(item => item.blocked_id) || [];
    } catch (error) {
      console.error('❌ Error in getBlockedUserIds:', error);
      return [];
    }
  }

  /**
   * Check if current user is blocked by another user
   */
  async isBlockedBy(userId: string): Promise<boolean> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        return false;
      }

      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', userId)
        .eq('blocked_id', currentUser.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('❌ Error checking if blocked by user:', error);
      return false;
    }
  }
}

export const userSafetyService = new UserSafetyService(); 