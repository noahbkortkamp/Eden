import { supabase } from '../utils/supabase';

interface CourseSubmission {
  courseName: string;
  state: string;
}

/**
 * Submits a course submission to the database
 * @param submission The course submission data
 * @returns A promise that resolves when the submission is completed
 */
export async function submitCourseSubmission(submission: CourseSubmission): Promise<void> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    const userId = userData.user?.id;
    const userEmail = userData.user?.email;
    if (!userId) throw new Error('User not authenticated');
    
    // Insert into course_submissions table
    const { error } = await supabase
      .from('course_submissions')
      .insert({
        user_id: userId,
        user_email: userEmail || null,
        course_name: submission.courseName,
        state: submission.state,
        status: 'pending'
      });
    
    if (error) throw error;
    
    console.log('Course submission submitted successfully:', submission.courseName);
  } catch (error) {
    console.error('Error submitting course:', error);
    throw error;
  }
} 