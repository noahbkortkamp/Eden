// React Native polyfills - simplified and robust approach
console.log('Loading React Native polyfills...');

try {
  // Load URL polyfill for React Native
  require('react-native-url-polyfill/auto');
  console.log('✓ URL polyfill loaded');
} catch (err) {
  console.warn('⚠ URL polyfill failed to load:', err.message);
}

try {
  // Load web streams polyfill only if needed
  if (typeof global.ReadableStream === 'undefined' || 
      typeof global.WritableStream === 'undefined' || 
      typeof global.TransformStream === 'undefined') {
    
    const webStreamsPolyfill = require('web-streams-polyfill');
    
    // Only assign if the polyfill actually provides the streams
    if (webStreamsPolyfill.ReadableStream) {
      global.ReadableStream = global.ReadableStream || webStreamsPolyfill.ReadableStream;
      console.log('✓ ReadableStream polyfill applied');
    }
    
    if (webStreamsPolyfill.WritableStream) {
      global.WritableStream = global.WritableStream || webStreamsPolyfill.WritableStream;
      console.log('✓ WritableStream polyfill applied');
    }
    
    if (webStreamsPolyfill.TransformStream) {
      global.TransformStream = global.TransformStream || webStreamsPolyfill.TransformStream;
      console.log('✓ TransformStream polyfill applied');
    }
  } else {
    console.log('✓ Web streams already available, skipping polyfill');
  }
} catch (err) {
  console.warn('⚠ Web streams polyfill failed to load:', err.message);
  console.warn('  This is non-critical - app will continue without streams polyfill');
}

// Additional React Native specific polyfills
try {
  // Ensure fetch is available (should be built-in to React Native, but just in case)
  if (typeof global.fetch === 'undefined') {
    console.warn('⚠ fetch is not available - this should not happen in React Native');
  }
  
  // Ensure AbortController is available
  if (typeof global.AbortController === 'undefined') {
    console.warn('⚠ AbortController is not available');
  }
} catch (err) {
  console.warn('⚠ Additional polyfill checks failed:', err.message);
}

console.log('✓ Polyfills initialization complete');

// Don't export anything to avoid module resolution issues
// The polyfills are applied to global scope directly 