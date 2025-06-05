import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// ================================================================================================
// 🚨 SUPABASE INITIALIZATION DEBUG: This runs when supabase.ts is imported
// ================================================================================================
console.log('🚨 SUPABASE: Starting supabase.ts initialization at', new Date().toISOString());

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// CRITICAL DEBUGGING FOR TESTFLIGHT - This will help us see what's happening
console.log('🚨 SUPABASE CRITICAL DEBUG INFO:');
console.log('📱 Platform:', require('react-native').Platform.OS);
console.log('🛠️ DEV mode:', __DEV__);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 All EXPO_PUBLIC keys:', Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')));
console.log('🔗 Supabase URL length:', supabaseUrl.length);
console.log('🔑 Supabase Key length:', supabaseAnonKey.length);
console.log('🔗 URL starts with https:', supabaseUrl.startsWith('https://'));
console.log('🔑 Key starts with ey:', supabaseAnonKey.startsWith('ey'));

// More detailed URL validation
if (supabaseUrl) {
  console.log('🔗 Supabase URL details:', {
    length: supabaseUrl.length,
    startsWithHttps: supabaseUrl.startsWith('https://'),
    endsWithSupabaseCo: supabaseUrl.endsWith('.supabase.co'),
    contains: {
      supabase: supabaseUrl.includes('supabase'),
      https: supabaseUrl.includes('https'),
      dot: supabaseUrl.includes('.')
    }
  });
} else {
  console.error('🚨 SUPABASE: URL is completely missing!');
}

// More detailed key validation
if (supabaseAnonKey) {
  console.log('🔑 Supabase Key details:', {
    length: supabaseAnonKey.length,
    startsWithEy: supabaseAnonKey.startsWith('ey'),
    hasDots: (supabaseAnonKey.match(/\./g) || []).length,
    hasHyphens: (supabaseAnonKey.match(/-/g) || []).length,
    hasUnderscores: (supabaseAnonKey.match(/_/g) || []).length
  });
} else {
  console.error('🚨 SUPABASE: Key is completely missing!');
}

// Alert for production debugging (will show on screen) - but make it safer
if (!__DEV__) {
  // Use setTimeout to ensure this runs after app initialization, and wrap in try-catch
  setTimeout(() => {
    try {
      const message = `Supabase Environment Check:
URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}
Key: ${supabaseAnonKey ? '✅ Present' : '❌ Missing'}
URL Length: ${supabaseUrl.length}
Key Length: ${supabaseAnonKey.length}`;
      
      console.log('🚨 SUPABASE: Attempting to show production alert...');
      
      // This will create a visible alert in production
      const RN = require('react-native');
      if (RN && RN.Alert) {
        RN.Alert.alert('Supabase Debug Info', message);
        console.log('🚨 SUPABASE: Production alert shown successfully');
      } else {
        console.error('🚨 SUPABASE: React Native Alert not available');
      }
    } catch (alertError) {
      console.error('🚨 SUPABASE: Error showing production alert:', alertError);
    }
  }, 2000);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE CRITICAL: Missing Supabase credentials');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey);
  
  // Don't throw error, create a dummy client to prevent crashes
  console.log('🚨 SUPABASE: Creating fallback client to prevent crashes');
}

let supabaseClient: SupabaseClient<Database>;

try {
  console.log('🚨 SUPABASE: Attempting to create Supabase client...');
  
  // Validate inputs before creating client
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(`Missing Supabase credentials - URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`);
  }
  
  if (!supabaseUrl.startsWith('https://')) {
    throw new Error(`Invalid Supabase URL format: ${supabaseUrl.substring(0, 20)}...`);
  }
  
  if (!supabaseAnonKey.startsWith('ey')) {
    throw new Error(`Invalid Supabase key format: ${supabaseAnonKey.substring(0, 10)}...`);
  }
  
  console.log('🚨 SUPABASE: Credentials validated, creating client...');
  
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
    },
  });
  
  console.log('✅ SUPABASE: Client created successfully');
  
} catch (clientError) {
  console.error('🚨 SUPABASE: Failed to create client:', clientError);
  
  // Create a dummy client that won't crash the app
  console.log('🚨 SUPABASE: Creating emergency fallback client...');
  
  try {
    // Create with dummy values to prevent crashes
    supabaseClient = createClient<Database>(
      'https://dummy.supabase.co', 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15IiwiaWF0IjoxNjAwMDAwMDAwfQ.dummy',
      {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    console.log('✅ SUPABASE: Emergency fallback client created');
  } catch (fallbackError) {
    console.error('🚨 SUPABASE: Even fallback client failed:', fallbackError);
    throw fallbackError; // This will be caught by error boundaries
  }
}

export const supabase = supabaseClient;

console.log('🚨 SUPABASE: supabase.ts initialization complete at', new Date().toISOString()); 