import { CourseReview, Course } from '../types/review';
import { supabase } from '../utils/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Log error if API URL is not configured in production
if (!API_BASE_URL && !__DEV__) {
  console.error('SECURITY WARNING: EXPO_PUBLIC_API_URL is not configured in production');
}

export const reviewService = {
  /**
   * Submit a new course review
   */
  submitReview: async (review: Omit<CourseReview, 'review_id' | 'created_at' | 'updated_at'>): Promise<CourseReview> => {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Upload photos for a review
   */
  uploadPhotos: async (reviewId: string, photos: string[]): Promise<string[]> => {
    const formData = new FormData();
    photos.forEach((photo, index) => {
      formData.append('photos', {
        uri: photo,
        type: 'image/jpeg',
        name: `photo-${index}.jpg`,
      });
    });

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/photos`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload photos');
    }

    return response.json();
  },

  /**
   * Get courses for comparison in the same rating tier
   */
  getCoursesForComparison: async (rating: string): Promise<Course[]> => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('rating_tier', rating)
      .limit(2);

    if (error) throw error;
    return data;
  },

  /**
   * Submit a course comparison preference
   */
  submitComparison: async (
    userId: string,
    preferredCourseId: string,
    otherCourseId: string
  ): Promise<void> => {
    try {
      console.log('Submitting comparison:', {
        userId,
        preferredCourseId,
        otherCourseId
      });

      // Verify input parameters
      if (!userId || !preferredCourseId || !otherCourseId) {
        throw new Error('Missing required parameters');
      }

      // First verify table exists and is accessible
      console.log('Verifying table access...');
      const { error: tableError } = await supabase
        .schema('public')
        .from('course_comparisons')
        .select('count', { count: 'exact', head: true });

      if (tableError) {
        console.error('Error accessing course_comparisons table:', {
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint,
          code: tableError.code
        });
        throw new Error(`Table access error: ${tableError.message}`);
      }

      console.log('Table access verified');

      // Then verify the courses exist
      const { data: courses, error: coursesError } = await supabase
        .schema('public')
        .from('courses')
        .select('id, name')
        .in('id', [preferredCourseId, otherCourseId]);

      if (coursesError) {
        console.error('Error verifying courses:', coursesError);
        throw coursesError;
      }

      if (!courses || courses.length !== 2) {
        console.error('Courses not found:', { preferredCourseId, otherCourseId });
        throw new Error('One or both courses not found');
      }

      console.log('Found courses:', courses);

      // Prepare the insert data
      const insertData = {
        user_id: userId,
        preferred_course_id: preferredCourseId,
        other_course_id: otherCourseId
      };

      // Log the complete request details
      const client = supabase.from('course_comparisons');
      console.log('Request configuration:', {
        url: client.url,
        path: client.path,
        headers: supabase.rest.headers,
        schema: supabase.rest.schema,
        body: insertData
      });

      // Try the insert with complete error details
      const { data, error: insertError, status, statusText } = await supabase
        .schema('public')
        .from('course_comparisons')
        .insert(insertData)
        .select()
        .single();

      // Log complete response
      console.log('Insert response:', {
        success: !insertError,
        status,
        statusText,
        data,
        error: insertError ? {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        } : null
      });

      if (insertError) {
        console.error('Insert error details:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          status,
          statusText
        });

        // Try to get raw error details
        if (insertError instanceof Error) {
          console.error('Error instance details:', {
            name: insertError.name,
            message: insertError.message,
            stack: insertError.stack
          });
        }

        // Try to access raw response
        const rawError = insertError as any;
        if (rawError.response) {
          try {
            const responseText = await rawError.response.text();
            console.error('Raw response:', {
              status: rawError.response.status,
              statusText: rawError.response.statusText,
              body: responseText
            });
          } catch (e) {
            console.error('Failed to read raw response:', e);
          }
        }
        
        throw new Error(`Failed to insert comparison: ${insertError.message || `Status ${status}: ${statusText}`}`);
      }

      console.log('Insert successful:', data);

    } catch (error) {
      console.error('Error in submitComparison:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error('Non-Error object thrown:', {
          error,
          stringified: JSON.stringify(error, null, 2)
        });
      }
      throw error;
    }
  },

  /**
   * Get a user's review history
   */
  getUserReviews: async (userId: string): Promise<CourseReview[]> => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get a user's review for a specific course
   */
  getUserCourseReview: async (userId: string, courseId: string): Promise<any | null> => {
    try {
      console.log(`Fetching review for user ${userId} and course ${courseId}`);
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          tags:review_tags(tag:tag_id(*)),
          course:course_id(name, location, type, price_level, par, yardage)
        `)
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .order('date_played', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No review found for this user and course');
          return null;
        }
        console.error('Error fetching user course review:', error);
        throw error;
      }

      // Transform the tags data to make it more accessible
      if (data && data.tags) {
        // Log the raw tags data to help with debugging
        console.log('Raw review tags data:', JSON.stringify(data.tags));
        
        // Make sure we're properly transforming the nested tag objects
        data.tags = data.tags.map(item => item.tag);
        
        // Log the transformed tags to verify they're correct
        console.log('Transformed tags:', JSON.stringify(data.tags));
      } else {
        console.log('No tags found for this review');
      }

      return data;
    } catch (error) {
      console.error('Error in getUserCourseReview:', error);
      throw error;
    }
  },

  /**
   * Get a specific review by ID with complete details
   */
  getReviewDetail: async (reviewId: string): Promise<any | null> => {
    try {
      console.log(`Fetching review details for ID ${reviewId}`);
      
      // First get the review to determine course_id and user_id
      const { data: reviewBasic, error: reviewError } = await supabase
        .from('reviews')
        .select('id, course_id, user_id')
        .eq('id', reviewId)
        .single();

      if (reviewError) {
        console.error('Error fetching basic review data:', reviewError);
        throw reviewError;
      }

      // Get the full review with related data including all course rankings
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          tags:review_tags(tag:tag_id(*)),
          course:course_id(
            name, 
            location, 
            type, 
            price_level, 
            par, 
            yardage,
            course_rankings(relative_score, user_id, created_at)
          ),
          user:user_id(id, full_name, avatar_url)
        `)
        .eq('id', reviewId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Review not found');
          return null;
        }
        console.error('Error fetching review details:', error);
        throw error;
      }

      // Transform the tags data to make it more accessible
      if (data && data.tags) {
        // Log the raw tags data to help with debugging
        console.log('Raw review detail tags data:', JSON.stringify(data.tags));
        
        // Make sure we're properly transforming the nested tag objects
        data.tags = data.tags.map(item => item.tag);
        
        // Log the transformed tags to verify they're correct
        console.log('Transformed review detail tags:', JSON.stringify(data.tags));
      } else {
        console.log('No tags found for this review detail');
      }

      // Find the most appropriate relative score
      if (data?.course?.course_rankings && data.course.course_rankings.length > 0) {
        console.log(`Found ${data.course.course_rankings.length} rankings for this course`);
        
        // Only use the reviewer's own ranking - this is the key change
        const reviewerRanking = data.course.course_rankings.find(
          r => r.user_id === data.user_id
        );
        
        if (reviewerRanking) {
          data.relative_score = reviewerRanking.relative_score;
          console.log("Using review creator's ranking:", data.relative_score);
        } else {
          // Fallback only if needed (shouldn't normally happen)
          const sortedRankings = [...data.course.course_rankings].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          data.relative_score = sortedRankings[0]?.relative_score || data.course.course_rankings[0].relative_score;
          console.log("Fallback to available ranking:", data.relative_score);
        }
      }

      console.log('Review details loaded successfully:', {
        user_id: data?.user_id,
        rating: data?.rating,
        sentiment: data?.sentiment,
        relative_score: data?.relative_score,
        all_rankings: data?.course?.course_rankings?.map(r => ({user_id: r.user_id, score: r.relative_score}))
      });
      
      return data;
    } catch (error) {
      console.error('Error in getReviewDetail:', error);
      throw error;
    }
  },

  /**
   * Get the count of reviews submitted by a user
   */
  getUserReviewCount: async (userId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error("Error fetching review count:", error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Get a user's review for a specific course (alias for getUserCourseReview)
   */
  getReviewByCourseId: async (userId: string, courseId: string): Promise<any | null> => {
    return reviewService.getUserCourseReview(userId, courseId);
  },
}; 