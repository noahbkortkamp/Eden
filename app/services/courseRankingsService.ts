import { supabase } from '../utils/supabase';
import type { Database } from '../utils/database.types';

type CourseRanking = Database['public']['Tables']['course_rankings']['Row'];

interface CourseStatistics {
  averageScore: number;
  totalRankings: number;
  currentUserScore?: number;
}

interface CourseReviewNote {
  notes: string;
  datePlayed: string;
  userName: string;
  avatarUrl?: string;
}

export const courseRankingsService = {
  /**
   * Get course statistics using reviews count and course_rankings average
   * Returns count from reviews table and average from course_rankings table
   */
  getCourseStatistics: async (courseId: string, currentUserId?: string): Promise<CourseStatistics> => {
    console.log(`[CourseRankingsService] Getting statistics for course ${courseId}`);
    
    try {
      // Get count of reviews for this course
      const { count: reviewCount, error: reviewError } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (reviewError) {
        console.error('[CourseRankingsService] Error counting reviews:', reviewError);
        throw reviewError;
      }

      // Get all course rankings for this course to calculate average
      const { data: rankings, error: rankingsError } = await supabase
        .from('course_rankings')
        .select('relative_score, user_id')
        .eq('course_id', courseId);

      if (rankingsError) {
        console.error('[CourseRankingsService] Error fetching course rankings:', rankingsError);
        throw rankingsError;
      }

      const totalReviews = reviewCount || 0;
      
      // Calculate average from course rankings
      let averageScore = 0;
      let currentUserScore: number | undefined;

      if (rankings && rankings.length > 0) {
        const totalScore = rankings.reduce((sum, ranking) => sum + ranking.relative_score, 0);
        averageScore = Math.round((totalScore / rankings.length) * 10) / 10; // Round to 1 decimal

        // Find current user's score
        const currentUserRanking = currentUserId 
          ? rankings.find(r => r.user_id === currentUserId)
          : undefined;
        
        currentUserScore = currentUserRanking?.relative_score;
      }

      console.log(`[CourseRankingsService] Statistics: ${averageScore}/10 average from ${rankings?.length || 0} rankings, ${totalReviews} total reviews`);

      return {
        averageScore,
        totalRankings: totalReviews, // Use review count, not ranking count
        currentUserScore
      };
    } catch (error) {
      console.error('[CourseRankingsService] Error in getCourseStatistics:', error);
      throw error;
    }
  },

  /**
   * Get review notes for a course
   * Returns recent review notes with user information
   */
  getCourseReviewNotes: async (courseId: string, limit: number = 8): Promise<CourseReviewNote[]> => {
    console.log(`[CourseRankingsService] Getting review notes for course ${courseId}`);
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          notes,
          date_played,
          user:user_id(
            full_name,
            avatar_url
          )
        `)
        .eq('course_id', courseId)
        .not('notes', 'is', null)
        .neq('notes', '')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[CourseRankingsService] Error fetching review notes:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('[CourseRankingsService] No review notes found for this course');
        return [];
      }

      // Transform the data
      const notes: CourseReviewNote[] = data.map(review => ({
        notes: review.notes || '',
        datePlayed: review.date_played || '',
        userName: review.user?.full_name || 'Anonymous',
        avatarUrl: review.user?.avatar_url
      }));

      console.log(`[CourseRankingsService] Found ${notes.length} review notes`);
      return notes;
    } catch (error) {
      console.error('[CourseRankingsService] Error in getCourseReviewNotes:', error);
      throw error;
    }
  }
}; 