// Use conditional requires for Node.js compatibility
let ReadableStream, WritableStream, TransformStream;

// In a Node.js environment, we need to use require
if (typeof window === 'undefined') {
  // We're in Node.js
  try {
    // Try to load URL polyfill (Node version) - make it optional
    try {
      require('url-polyfill');
      console.log('Node.js: URL polyfill applied');
    } catch (urlErr) {
      // URL polyfill is optional for Node.js
      console.log('Node.js: URL polyfill not found, but Node.js already has URL support');
    }
    
    // Load web streams polyfill
    const webStreams = require('web-streams-polyfill');
    ReadableStream = webStreams.ReadableStream;
    WritableStream = webStreams.WritableStream;
    TransformStream = webStreams.TransformStream;
    
    // Apply to global for Node.js
    if (typeof global.ReadableStream === 'undefined') {
      global.ReadableStream = ReadableStream;
      console.log('Node.js: ReadableStream polyfill applied');
    }
    
    if (typeof global.WritableStream === 'undefined') {
      global.WritableStream = WritableStream;
      console.log('Node.js: WritableStream polyfill applied');
    }
    
    if (typeof global.TransformStream === 'undefined') {
      global.TransformStream = TransformStream;
      console.log('Node.js: TransformStream polyfill applied');
    }
  } catch (err) {
    console.error('Failed to load polyfills in Node.js:', err);
  }
} else {
  // We're in React Native or a browser environment
  try {
    // Import React Native URL polyfill
    require('react-native-url-polyfill/auto');
    
    // Import web-streams-polyfill
    const streamPolyfill = require('web-streams-polyfill');
    ReadableStream = streamPolyfill.ReadableStream;
    WritableStream = streamPolyfill.WritableStream;
    TransformStream = streamPolyfill.TransformStream;
    
    // Apply to global
    if (typeof global.ReadableStream === 'undefined') {
      global.ReadableStream = ReadableStream;
      console.log('React Native: ReadableStream polyfill applied');
    }
    
    if (typeof global.WritableStream === 'undefined') {
      global.WritableStream = WritableStream;
      console.log('React Native: WritableStream polyfill applied');
    }
    
    if (typeof global.TransformStream === 'undefined') {
      global.TransformStream = TransformStream;
      console.log('React Native: TransformStream polyfill applied');
    }
  } catch (err) {
    console.error('Failed to load polyfills in React Native:', err);
  }
}

// Export for ESM compatibility
module.exports = {
  ReadableStream,
  WritableStream,
  TransformStream
}; 