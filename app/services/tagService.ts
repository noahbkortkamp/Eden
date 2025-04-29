import { supabase } from '../utils/supabase';

interface TagSuggestion {
  tagName: string;
  category?: string;
}

/**
 * Submits a tag suggestion to the database
 * @param suggestion The tag suggestion data
 * @returns A promise that resolves when the suggestion is submitted
 */
export async function submitTagSuggestion(suggestion: TagSuggestion): Promise<void> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    const userId = userData.user?.id;
    if (!userId) throw new Error('User not authenticated');
    
    // Insert into tag_suggestions table
    const { error } = await supabase
      .from('tag_suggestions')
      .insert({
        user_id: userId,
        tag_name: suggestion.tagName,
        category: suggestion.category || null,
        status: 'pending'
      });
    
    if (error) throw error;
    
    console.log('Tag suggestion submitted successfully:', suggestion.tagName);
  } catch (error) {
    console.error('Error submitting tag suggestion:', error);
    throw error;
  }
} 