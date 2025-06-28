import { supabase } from '../utils/supabase';
import type { Database } from '../utils/database.types';

type CourseRanking = Database['public']['Tables']['course_rankings']['Row'];

interface CourseStatistics {
  averageScore: number;
  totalRankings: number;
  currentUserScore?: number;
}

interface CourseReviewNote {
  id: string;
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
          id,
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
        id: review.id,
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
  },

  /**
   * Get all reviews for a course with complete details
   * Returns all reviews with user info, tags, scores, and other details
   */
  getAllCourseReviews: async (courseId: string): Promise<Array<{
    id: string;
    user_id: string;
    course_id: string;
    rating: 'liked' | 'fine' | 'didnt_like';
    notes: string | null;
    favorite_holes: number[];
    photos: string[];
    date_played: string;
    created_at: string;
    user: {
      full_name: string;
      avatar_url: string | null;
    };
    tags: Array<{
      id: string;
      name: string;
      category: string;
    }>;
    relative_score?: number;
  }>> => {
    console.log(`[CourseRankingsService] Getting all reviews for course ${courseId}`);
    
    try {
      // Get all reviews with user information
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          user_id,
          course_id,
          rating,
          notes,
          favorite_holes,
          photos,
          date_played,
          created_at,
          user:user_id(
            full_name,
            avatar_url
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('[CourseRankingsService] Error fetching reviews:', reviewsError);
        throw reviewsError;
      }

      if (!reviews || reviews.length === 0) {
        console.log('[CourseRankingsService] No reviews found for this course');
        return [];
      }

      // Get tags for all reviews
      const reviewIds = reviews.map(r => r.id);
      const { data: reviewTags, error: tagsError } = await supabase
        .from('review_tags')
        .select(`
          review_id,
          tag:tag_id(
            id,
            name,
            category
          )
        `)
        .in('review_id', reviewIds);

      if (tagsError) {
        console.error('[CourseRankingsService] Error fetching tags:', tagsError);
        // Continue without tags rather than failing
      }

      // Get course rankings for relative scores
      const userIds = reviews.map(r => r.user_id);
      const { data: rankings, error: rankingsError } = await supabase
        .from('course_rankings')
        .select('user_id, relative_score')
        .eq('course_id', courseId)
        .in('user_id', userIds);

      if (rankingsError) {
        console.error('[CourseRankingsService] Error fetching rankings:', rankingsError);
        // Continue without scores rather than failing
      }

      // Create a map of tags by review ID
      const tagsByReview = new Map<string, Array<{id: string; name: string; category: string}>>();
      if (reviewTags) {
        reviewTags.forEach(rt => {
          if (rt.tag) {
            const reviewId = rt.review_id;
            if (!tagsByReview.has(reviewId)) {
              tagsByReview.set(reviewId, []);
            }
            tagsByReview.get(reviewId)!.push({
              id: rt.tag.id,
              name: rt.tag.name,
              category: rt.tag.category
            });
          }
        });
      }

      // Create a map of scores by user ID
      const scoresByUser = new Map<string, number>();
      if (rankings) {
        rankings.forEach(r => {
          scoresByUser.set(r.user_id, r.relative_score);
        });
      }

      // Combine all data
      const enrichedReviews = reviews.map(review => ({
        id: review.id,
        user_id: review.user_id,
        course_id: review.course_id,
        rating: review.rating,
        notes: review.notes,
        favorite_holes: review.favorite_holes || [],
        photos: review.photos || [],
        date_played: review.date_played,
        created_at: review.created_at,
        user: {
          full_name: review.user?.full_name || 'Anonymous',
          avatar_url: review.user?.avatar_url || null
        },
        tags: tagsByReview.get(review.id) || [],
        relative_score: scoresByUser.get(review.user_id)
      }));

      console.log(`[CourseRankingsService] Found ${enrichedReviews.length} reviews with complete details`);
      return enrichedReviews;
    } catch (error) {
      console.error('[CourseRankingsService] Error in getAllCourseReviews:', error);
      throw error;
    }
  }
}; 