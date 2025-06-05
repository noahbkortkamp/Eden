import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Always log in production to help debug black screen
console.log('🔍 Supabase Environment Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length,
  urlStart: supabaseUrl.substring(0, 20),
  keyStart: supabaseAnonKey.substring(0, 10),
  isDev: __DEV__
});

// Validate credentials before creating client
if (!supabaseUrl || !supabaseAnonKey) {
  const message = 'CRITICAL: Missing Supabase credentials - app will not function';
  console.error(message);
  console.error('URL present:', !!supabaseUrl, 'Key present:', !!supabaseAnonKey);
  if (!__DEV__) {
    // In production, crash early rather than create broken auth
    throw new Error(message);
  }
}

if (!supabaseUrl.startsWith('https://')) {
  const message = 'CRITICAL: Invalid Supabase URL format';
  console.error(message, 'URL:', supabaseUrl.substring(0, 30));
  if (!__DEV__) {
    throw new Error(message);
  }
}

if (!supabaseAnonKey.startsWith('ey')) {
  const message = 'CRITICAL: Invalid Supabase key format';
  console.error(message, 'Key start:', supabaseAnonKey.substring(0, 10));
  if (!__DEV__) {
    throw new Error(message);
  }
}

console.log('✅ Creating Supabase client...');

// Create the Supabase client
const supabaseClient: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Prevent automatic URL parsing issues
    },
  }
);

console.log('✅ Supabase client created successfully');

export const supabase = supabaseClient; 