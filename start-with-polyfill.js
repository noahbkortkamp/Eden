#!/usr/bin/env node

// Load polyfills for Node.js compatibility
console.log('Adding polyfills for Node.js compatibility...');

try {
  // Import the web-streams-polyfill package (already in dependencies)
  const webStreamsPolyfill = require('web-streams-polyfill');
  
  // Apply all the stream polyfills to global
  if (!global.ReadableStream) {
    global.ReadableStream = webStreamsPolyfill.ReadableStream;
    console.log('✅ Added ReadableStream polyfill');
  }
  
  if (!global.WritableStream) {
    global.WritableStream = webStreamsPolyfill.WritableStream;
    console.log('✅ Added WritableStream polyfill');
  }
  
  if (!global.TransformStream) {
    global.TransformStream = webStreamsPolyfill.TransformStream;
    console.log('✅ Added TransformStream polyfill');
  }
  
  if (!global.ByteLengthQueuingStrategy) {
    global.ByteLengthQueuingStrategy = webStreamsPolyfill.ByteLengthQueuingStrategy;
    console.log('✅ Added ByteLengthQueuingStrategy polyfill');
  }
  
  if (!global.CountQueuingStrategy) {
    global.CountQueuingStrategy = webStreamsPolyfill.CountQueuingStrategy;
    console.log('✅ Added CountQueuingStrategy polyfill');
  }
  
  console.log('✅ Successfully added web-streams-polyfill');
} catch (err) {
  console.error('❌ Failed to load web-streams-polyfill:', err.message);
  console.error('Please make sure web-streams-polyfill is installed:');
  console.error('npm install web-streams-polyfill --save-dev');
}

// Also ensure URL polyfill is available for node
try {
  if (!global.URL || !global.URLSearchParams) {
    const urlPolyfill = require('url-polyfill');
    console.log('✅ URL polyfill loaded');
  }
} catch (err) {
  console.warn('⚠️ URL polyfill not found, but might not be needed');
}

// Launch Expo with the host=lan option by default
const { spawn } = require('child_process');
const args = ['expo', 'start', '--host=lan', ...process.argv.slice(2)];

console.log(`Launching Expo with: npx ${args.join(' ')}`);
spawn('npx', args, { 
  stdio: 'inherit',
  env: {
    ...process.env,
    // Add environment variables if needed
    EXPO_USE_READABLESTREAM_POLYFILL: 'true'
  }
}); 