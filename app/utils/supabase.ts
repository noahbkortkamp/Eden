import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Replace these with your Supabase project URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug logging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key length:', supabaseAnonKey.length);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check your .env file');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: false,
  },
}); 