import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { Alert } from 'react-native';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Enhanced environment debug logging for production
const envDebug = {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length,
  urlStart: supabaseUrl.substring(0, 30),
  keyStart: supabaseAnonKey.substring(0, 15),
  isDev: __DEV__,
  nodeEnv: process.env.NODE_ENV,
  allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC')),
  platform: typeof window !== 'undefined' ? 'web' : 'native'
};

console.log('🔍 Enhanced Supabase Environment Check:', envDebug);

// Critical validation with safer error handling
let initializationError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  initializationError = `Missing Supabase credentials - URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`;
} else if (!supabaseUrl.startsWith('https://')) {
  initializationError = `Invalid Supabase URL format: ${supabaseUrl.substring(0, 30)}...`;
} else if (!supabaseAnonKey.startsWith('ey')) {
  initializationError = `Invalid Supabase key format: ${supabaseAnonKey.substring(0, 15)}...`;
}

if (initializationError) {
  console.error('🚨 SUPABASE INITIALIZATION ERROR:', initializationError);
  
  // Show alert in production for debugging
  if (!__DEV__) {
    setTimeout(() => {
      Alert.alert(
        '🚨 Configuration Error',
        `Supabase initialization failed:\n\n${initializationError}\n\nEnv Debug:\n${JSON.stringify(envDebug, null, 2)}`,
        [{ text: 'OK' }]
      );
    }, 1000);
  }
  
  // Don't crash the app - create a dummy client to prevent import errors
  console.log('🔧 Creating fallback Supabase client to prevent crashes...');
}

let supabaseClient: SupabaseClient<Database>;

try {
  console.log('✅ Creating Supabase client...');
  
  // Use fallback values if needed to prevent crashes
  const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
  const safeKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder';
  
  supabaseClient = createClient<Database>(
    safeUrl, 
    safeKey, 
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
  
  if (initializationError) {
    console.warn('⚠️ Supabase client created with fallback values - authentication will not work');
  }
  
} catch (error) {
  console.error('🚨 CRITICAL: Failed to create Supabase client:', error);
  
  // Show detailed error in production
  if (!__DEV__) {
    setTimeout(() => {
      Alert.alert(
        '🚨 Critical Error',
        `Failed to create Supabase client:\n\n${error instanceof Error ? error.message : String(error)}\n\nThis will prevent app functionality.`,
        [{ text: 'OK' }]
      );
    }, 1500);
  }
  
  // Create an absolute minimal fallback to prevent import crashes
  throw new Error(`Supabase client creation failed: ${error}`);
}

export const supabase = supabaseClient; 