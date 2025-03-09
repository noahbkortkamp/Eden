import { supabase } from '../config/supabase';
import { Course } from '../types';

export interface UserCourseList {
  id: string;
  user_id: string;
  course_id: string;
  status: 'played' | 'want_to_play';
  created_at: string;
  course: Course;
}

export const courseListService = {
  async getPlayedCourses(userId: string): Promise<UserCourseList[]> {
    try {
      // Get all reviews for the user
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          user_id,
          course_id,
          created_at,
          course:courses(*)
        `)
        .eq('user_id', userId);

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
        throw reviewsError;
      }

      if (!reviews || reviews.length === 0) {
        return [];
      }

      // Map reviews to UserCourseList format
      return reviews.map(review => ({
        id: review.id,
        user_id: review.user_id,
        course_id: review.course_id,
        status: 'played' as const, // Mark as played instead of want_to_play
        created_at: review.created_at,
        course: review.course
      }));
    } catch (error) {
      console.error('Error in getPlayedCourses:', error);
      throw error;
    }
  },

  async getWantToPlayCourses(userId: string): Promise<UserCourseList[]> {
    try {
      // Get want to play courses with a two-step query
      const { data: lists, error: listsError } = await supabase
        .from('user_course_lists')
        .select('course_id')
        .eq('user_id', userId)
        .eq('status', 'want_to_play');

      if (listsError) {
        console.error('Error fetching want to play list:', listsError);
        throw listsError;
      }

      if (!lists || lists.length === 0) {
        return [];
      }

      // Get the course details
      const courseIds = lists.map(list => list.course_id);
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .in('id', courseIds);

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        throw coursesError;
      }

      // Combine the data
      return lists.map((list, index) => ({
        id: list.id || `${userId}-${list.course_id}`, // Generate an ID if none exists
        user_id: userId,
        course_id: list.course_id,
        status: 'want_to_play',
        created_at: list.created_at || new Date().toISOString(),
        course: courses?.find(course => course.id === list.course_id) || courses[0]
      }));
    } catch (error) {
      console.error('Error in getWantToPlayCourses:', error);
      throw error;
    }
  },

  async addToWantToPlayList(userId: string, courseId: string): Promise<void> {
    const { error } = await supabase
      .from('user_course_lists')
      .upsert({
        user_id: userId,
        course_id: courseId,
        status: 'want_to_play',
      });

    if (error) {
      console.error('Error adding course to want to play list:', error);
      throw error;
    }
  },

  async removeFromWantToPlayList(userId: string, courseId: string): Promise<void> {
    const { error } = await supabase
      .from('user_course_lists')
      .delete()
      .match({ 
        user_id: userId, 
        course_id: courseId,
        status: 'want_to_play'
      });

    if (error) {
      console.error('Error removing course from want to play list:', error);
      throw error;
    }
  },
}; 