import { CourseReview, Course } from '../types/review';
import { supabase } from '../utils/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

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
}; 