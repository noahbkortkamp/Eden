import { supabase } from '../config/supabase';
import { Course } from '../types';

/**
 * Service for managing user bookmarks of golf courses
 */
export const bookmarkService = {
  /**
   * Add a course to a user's bookmarks
   * @param userId - The ID of the user
   * @param courseId - The ID of the course to bookmark
   * @returns A promise that resolves when the operation is complete
   */
  async addBookmark(userId: string, courseId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('saved_courses')
        .upsert({
          user_id: userId,
          course_id: courseId,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error adding bookmark:', error);
        throw error;
      }

      console.log(`Successfully bookmarked course ${courseId} for user ${userId}`);
    } catch (error) {
      console.error('Error in addBookmark:', error);
      throw error;
    }
  },

  /**
   * Remove a course from a user's bookmarks
   * @param userId - The ID of the user
   * @param courseId - The ID of the course to remove from bookmarks
   * @returns A promise that resolves when the operation is complete
   */
  async removeBookmark(userId: string, courseId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('saved_courses')
        .delete()
        .match({ 
          user_id: userId, 
          course_id: courseId
        });

      if (error) {
        console.error('Error removing bookmark:', error);
        throw error;
      }

      console.log(`Successfully removed bookmark for course ${courseId} for user ${userId}`);
    } catch (error) {
      console.error('Error in removeBookmark:', error);
      throw error;
    }
  },

  /**
   * Get IDs of all courses bookmarked by a user
   * @param userId - The ID of the user
   * @returns A promise that resolves to an array of course IDs
   */
  async getBookmarkedCourseIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('saved_courses')
        .select('course_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching bookmarked course IDs:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const courseIds = data.map(item => item.course_id);
      console.log(`Retrieved ${courseIds.length} bookmarked course IDs for user ${userId}`);
      return courseIds;
    } catch (error) {
      console.error('Error in getBookmarkedCourseIds:', error);
      throw error;
    }
  },

  /**
   * Get full details of all courses bookmarked by a user
   * @param userId - The ID of the user
   * @returns A promise that resolves to an array of Course objects
   */
  async getBookmarkedCourses(userId: string): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from('saved_courses')
        .select(`
          course_id,
          courses:course_id(*)
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching bookmarked courses:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform the data into Course objects
      const courses: Course[] = data.map(item => item.courses);
      console.log(`Retrieved ${courses.length} bookmarked courses for user ${userId}`);
      return courses;
    } catch (error) {
      console.error('Error in getBookmarkedCourses:', error);
      throw error;
    }
  },
}; 