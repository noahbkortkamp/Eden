// Global error handlers to prevent app crashes
if (typeof global !== 'undefined') {
  // Handle unhandled promise rejections
  const originalHandler = global.onunhandledrejection;
  global.onunhandledrejection = function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Only show in development
    if (__DEV__) {
      console.warn('This promise rejection was handled to prevent app crash');
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
    console.error('Global Error:', { message, source, lineno, colno, error });
    
    // Call original handler if it exists
    if (originalErrorHandler) {
      return originalErrorHandler.call(this, message, source, lineno, colno, error);
    }
    
    // Return true to prevent default error handling
    return true;
  };
}

// Minimal environment validation (development only)
if (__DEV__) {
  console.log('App starting - Environment check:', {
    hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  });
}

// Import polyfills first
import './polyfills';

// Then import the app registration
import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App); 