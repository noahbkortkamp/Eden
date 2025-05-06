// Load polyfills for Node.js compatibility
if (!global.ReadableStream) {
  console.log('ReadableStream not found - adding polyfill');
  
  // Define a minimal ReadableStream implementation
  global.ReadableStream = class ReadableStream {
    constructor(underlyingSource, strategy) {
      this._source = underlyingSource;
      this._strategy = strategy;
    }
    
    getReader() {
      return {
        read: async () => ({ done: true, value: undefined }),
        releaseLock: () => {}
      };
    }
    
    pipeThrough() {
      return new global.ReadableStream();
    }
    
    pipeTo() {
      return Promise.resolve();
    }
  };
  
  console.log('✅ Added minimal ReadableStream polyfill');
}

// Also ensure WritableStream exists
if (!global.WritableStream) {
  global.WritableStream = class WritableStream {
    constructor() {}
    getWriter() {
      return {
        write: async () => {},
        close: async () => {},
        abort: async () => {},
        releaseLock: () => {}
      };
    }
  };
  console.log('✅ Added minimal WritableStream polyfill');
}

// Run Expo with child_process
const { spawn } = require('child_process');
console.log('Starting Expo CLI with polyfills...');

// Start the Expo process
const expo = spawn('npx', ['expo', 'start'], { 
  stdio: 'inherit',
  env: process.env 
});

// Handle process events
expo.on('error', (err) => {
  console.error('Failed to start Expo:', err);
  process.exit(1);
});

expo.on('close', (code) => {
  console.log(`Expo process exited with code ${code}`);
  process.exit(code);
}); 