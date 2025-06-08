// PRODUCTION-READY GOLF COURSE REVIEW ENTRY POINT
console.log('🚀 STARTUP: JavaScript execution started!');
console.log('🚀 STARTUP: Platform:', typeof global !== 'undefined' ? 'global exists' : 'no global');
console.log('🚀 STARTUP: React Native check:', typeof require !== 'undefined' ? 'require exists' : 'no require');
console.log('🚀 STARTUP: Hermes engine:', !!global.HermesInternal ? 'enabled' : 'disabled');

// Environment validation for production
const envVars = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  apiUrl: process.env.EXPO_PUBLIC_API_URL
};

console.log('🚀 STARTUP: Environment check:', {
  supabaseUrl: !!envVars.supabaseUrl,
  supabaseKey: !!envVars.supabaseKey,
  apiUrl: !!envVars.apiUrl // Should be false
});

// Validate critical environment variables
if (!envVars.supabaseUrl || !envVars.supabaseKey) {
  console.error('🚨 STARTUP ERROR: Missing critical environment variables');
  if (!__DEV__) {
    // In production, still try to start but log the issue
    console.error('🚨 PRODUCTION: App may not function properly without Supabase credentials');
  }
} else {
  console.log('✅ STARTUP: Environment variables validated');
}

// Import and start the main app
try {
  console.log('🚀 STARTUP: Loading expo-router/entry...');
  require('expo-router/entry');
  console.log('✅ STARTUP: expo-router/entry loaded successfully!');
} catch (error) {
  console.error('🚨 STARTUP FAILED: expo-router/entry import failed:', error.message);
  console.error('🚨 STARTUP FAILED: Error stack:', error.stack);
  
  // In production, attempt graceful degradation
  if (!__DEV__) {
    console.error('🚨 PRODUCTION FAILURE: Critical startup error - app will not function');
    // Could potentially show a native error screen here
  }
  throw error; // Re-throw to ensure the app doesn't silently fail
} 