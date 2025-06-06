// CRITICAL: Diagnostic Entry Point for Build 25 Black Screen Debug
console.log('🚨 === DIAGNOSTIC ENTRY POINT STARTING ===');
console.log('🚨 Platform:', typeof window !== 'undefined' ? 'web' : 'native');
console.log('🚨 DEV mode:', __DEV__);
console.log('🚨 Timestamp:', new Date().toISOString());

// Global error handlers to prevent app crashes
if (typeof global !== 'undefined') {
  // Handle unhandled promise rejections
  const originalHandler = global.onunhandledrejection;
  global.onunhandledrejection = function(event) {
    console.error('🚨 CRITICAL: Unhandled Promise Rejection during startup:', event.reason);
    
    // Show alert in production for debugging
    if (!__DEV__ && typeof alert !== 'undefined') {
      setTimeout(() => {
        alert(`🚨 Startup Error: ${event.reason}`);
      }, 100);
    }
    
    // Call original handler if it exists
    if (originalHandler) {
      originalHandler.call(this, event);
    }
    
    // Prevent the default behavior (which would crash the app)
    return true;
  };
  
  // Handle general errors
  const originalErrorHandler = global.onerror;
  global.onerror = function(message, source, lineno, colno, error) {
    console.error('🚨 CRITICAL: Global Error during startup:', { message, source, lineno, colno, error });
    
    // Call original handler if it exists
    if (originalErrorHandler) {
      return originalErrorHandler.call(this, message, source, lineno, colno, error);
    }
    
    // Return true to prevent default error handling
    return true;
  };
}

// Environment variable diagnostic (critical for Supabase)
console.log('🚨 === ENVIRONMENT VARIABLES DIAGNOSTIC ===');
const allEnvKeys = Object.keys(process.env);
const expoKeys = allEnvKeys.filter(key => key.startsWith('EXPO_PUBLIC'));
console.log('🚨 Total ENV keys:', allEnvKeys.length);
console.log('🚨 EXPO_PUBLIC keys:', expoKeys.length, expoKeys);
console.log('🚨 Supabase URL present:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('🚨 Supabase Key present:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
console.log('🚨 Supabase URL length:', (process.env.EXPO_PUBLIC_SUPABASE_URL || '').length);
console.log('🚨 Supabase Key length:', (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').length);

// Test polyfills loading
console.log('🚨 === POLYFILLS LOADING TEST ===');
try {
  // Import polyfills first
  require('./polyfills');
  console.log('✅ Polyfills loaded successfully');
} catch (polyfillError) {
  console.error('🚨 CRITICAL: Polyfills failed to load:', polyfillError);
  console.error('🚨 Polyfill error details:', polyfillError.message);
}

// Test Supabase initialization
console.log('🚨 === SUPABASE INITIALIZATION TEST ===');
let supabaseError = null;
try {
  const { supabase } = require('./app/utils/supabase');
  console.log('✅ Supabase client imported successfully');
  console.log('🔍 Supabase client type:', typeof supabase);
} catch (supabaseInitError) {
  console.error('🚨 CRITICAL: Supabase initialization failed:', supabaseInitError);
  console.error('🚨 Supabase error details:', supabaseInitError.message);
  supabaseError = supabaseInitError;
}

// Test Expo Router loading
console.log('🚨 === EXPO ROUTER LOADING TEST ===');
try {
  console.log('🔄 Loading expo-router/entry...');
  
  // If we have a critical error, show alert before continuing
  if (supabaseError && !__DEV__) {
    setTimeout(() => {
      if (typeof alert !== 'undefined') {
        alert(`🚨 Critical Supabase Error: ${supabaseError.message}`);
      }
    }, 500);
  }
  
  // Import Expo Router entry point
  require('expo-router/entry');
  console.log('✅ Expo Router loaded successfully');
  
} catch (routerError) {
  console.error('🚨 CRITICAL: Expo Router failed to load:', routerError);
  console.error('🚨 Router error details:', routerError.message);
  console.error('🚨 Router stack trace:', routerError.stack);
  
  // Show critical error in production
  if (!__DEV__ && typeof alert !== 'undefined') {
    setTimeout(() => {
      alert(`🚨 Router Error: ${routerError.message}`);
    }, 1000);
  }
  
  // Don't re-throw - let's see what happens
}

console.log('🚨 === DIAGNOSTIC ENTRY POINT COMPLETE ==='); 