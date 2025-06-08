import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Get environment variables with proper fallbacks
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Production validation (log errors but don't crash the app)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Supabase configuration missing:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl.length,
    keyLength: supabaseAnonKey.length
  });
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('🚨 Invalid Supabase URL format - must start with https://');
}

// Validate key format  
if (supabaseAnonKey && !supabaseAnonKey.startsWith('ey')) {
  console.error('🚨 Invalid Supabase key format - must be a valid JWT token');
}

// Create Supabase client with safe defaults
const createSupabaseClient = (): SupabaseClient<Database> => {
  // Use valid fallback values to prevent crashes
  const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
  const safeKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder';
  
  return createClient<Database>(safeUrl, safeKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Prevent URL parsing issues
    },
    global: {
      headers: {
        'X-Client-Info': 'golf-course-review-mobile'
      }
    }
  });
};

// Create and export the client
export const supabase = createSupabaseClient();

// Export validation function for app initialization
export const validateSupabaseConfig = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && 
           supabaseUrl.startsWith('https://') && 
           supabaseAnonKey.startsWith('ey'));
}; 