import { supabase } from '../utils/supabase';
import { Course } from '../types/review';

export type SentimentRating = 'liked' | 'fine' | 'didnt_like';

export interface EnhancedCourse extends Course {
  rank_position?: number;
  sentiment?: SentimentRating;
  showScores?: boolean;
}

/**
 * Simplified service for fetching played courses data
 * Uses step-by-step queries instead of complex joins to avoid database relationship issues
 */
export const playedCoursesService = {
  /**
   * Fetch played courses using simplified, reliable queries
   * Phase 1 implementation - no complex joins
   */
  async getPlayedCoursesSimplified(userId: string, showScores: boolean = false): Promise<EnhancedCourse[]> {
    console.log('🔍 [PlayedCoursesService] Starting simplified fetch for user:', userId.substring(0, 8));
    
    try {
      // Step 1: Get all user reviews (simple query)
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('course_id, rating, date_played, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('🚨 [PlayedCoursesService] Error fetching reviews:', reviewsError);
        throw reviewsError;
      }

      if (!reviews || reviews.length === 0) {
        console.log('🔍 [PlayedCoursesService] No reviews found for user');
        return [];
      }

      console.log(`🔍 [PlayedCoursesService] Found ${reviews.length} reviews`);

      // Step 2: Get all rankings for this user (simple query)
      const { data: rankings, error: rankingsError } = await supabase
        .from('course_rankings')
        .select('course_id, sentiment_category, relative_score, rank_position, updated_at')
        .eq('user_id', userId)
        .order('rank_position', { ascending: true });

      if (rankingsError) {
        console.error('🚨 [PlayedCoursesService] Error fetching rankings:', rankingsError);
        // Don't throw - continue without rankings
      }

      console.log(`🔍 [PlayedCoursesService] Found ${rankings?.length || 0} rankings`);

      // Step 3: Get course details for all reviewed courses (simple query)
      const courseIds = [...new Set(reviews.map(r => r.course_id))];
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, location, type, price_level, created_at, updated_at')
        .in('id', courseIds);

      if (coursesError) {
        console.error('🚨 [PlayedCoursesService] Error fetching courses:', coursesError);
        throw coursesError;
      }

      if (!courses || courses.length === 0) {
        console.error('🚨 [PlayedCoursesService] No course data found');
        throw new Error('Course data not found');
      }

      console.log(`🔍 [PlayedCoursesService] Found ${courses.length} courses`);

      // Step 4: Combine data on client side
      const rankingsMap = new Map<string, any>();
      rankings?.forEach(ranking => {
        rankingsMap.set(ranking.course_id, ranking);
      });

      const reviewsMap = new Map<string, any>();
      reviews.forEach(review => {
        reviewsMap.set(review.course_id, review);
      });

      // Step 5: Create enhanced courses array
      const enhancedCourses: EnhancedCourse[] = courses.map(course => {
        const review = reviewsMap.get(course.id);
        const ranking = rankingsMap.get(course.id);

        return {
          id: course.id,
          name: course.name,
          location: course.location,
          type: course.type,
          price_level: course.price_level,
          description: '', // Set empty for now
          created_at: course.created_at,
          updated_at: course.updated_at,
          rating: ranking?.relative_score || this.getDefaultScoreForSentiment(review?.rating || 'fine'),
          rank_position: ranking?.rank_position,
          sentiment: ranking?.sentiment_category || review?.rating,
          showScores,
          date_played: review?.date_played
        };
      });

      // Step 6: Sort using reliable client-side logic
      const sortedCourses = this.sortCoursesReliably(enhancedCourses);

      console.log(`✅ [PlayedCoursesService] Successfully processed ${sortedCourses.length} courses`);
      return sortedCourses;

    } catch (error) {
      console.error('🚨 [PlayedCoursesService] Error in getPlayedCoursesSimplified:', error);
      throw error;
    }
  },

  /**
   * Reliable sorting function that handles all edge cases
   * Phase 1 implementation - deterministic sorting
   */
  sortCoursesReliably(courses: EnhancedCourse[]): EnhancedCourse[] {
    return courses.sort((a, b) => {
      // Primary sort: Sentiment tier (liked → fine → didn't like)
      const sentimentOrder = { 'liked': 0, 'fine': 1, 'didnt_like': 2 };
      const aSentiment = a.sentiment || 'fine';
      const bSentiment = b.sentiment || 'fine';
      const tierDiff = sentimentOrder[aSentiment] - sentimentOrder[bSentiment];
      
      if (tierDiff !== 0) return tierDiff;

      // Secondary sort: Within tier, by relative_score (highest first)
      const aScore = a.rating || 0;
      const bScore = b.rating || 0;
      const scoreDiff = bScore - aScore;
      
      if (scoreDiff !== 0) return scoreDiff;

      // Tertiary sort: By rank_position (lowest first) if available
      if (a.rank_position && b.rank_position) {
        const positionDiff = a.rank_position - b.rank_position;
        if (positionDiff !== 0) return positionDiff;
      }

      // Quaternary sort: By date_played (most recent first)
      if (a.date_played && b.date_played) {
        return new Date(b.date_played).getTime() - new Date(a.date_played).getTime();
      }

      // Final fallback: alphabetical by name
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Get default score for sentiment when no ranking exists
   */
  getDefaultScoreForSentiment(sentiment: SentimentRating): number {
    const defaults = {
      'liked': 8.5,
      'fine': 5.5,
      'didnt_like': 2.5
    };
    return defaults[sentiment] || defaults.fine;
  },

  /**
   * Validate that course data is complete and consistent
   */
  validateCourseData(courses: EnhancedCourse[]): boolean {
    return courses.every(course => {
      // Check required fields
      if (!course.id || !course.name) {
        console.warn('🚨 [PlayedCoursesService] Course missing required fields:', course);
        return false;
      }

      // Check score ranges
      if (course.rating && (course.rating < 0 || course.rating > 10)) {
        console.warn('🚨 [PlayedCoursesService] Course score out of range:', course);
        return false;
      }

      // Check sentiment validity
      if (course.sentiment && !['liked', 'fine', 'didnt_like'].includes(course.sentiment)) {
        console.warn('🚨 [PlayedCoursesService] Invalid sentiment:', course);
        return false;
      }

      return true;
    });
  }
}; 