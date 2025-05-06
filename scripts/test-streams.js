// Import our polyfills first
require('../polyfills');

console.log('\n=== Stream Polyfill Test ===\n');

// Check if ReadableStream is available globally
console.log('ReadableStream available globally:', typeof global.ReadableStream !== 'undefined');
console.log('WritableStream available globally:', typeof global.WritableStream !== 'undefined');
console.log('TransformStream available globally:', typeof global.TransformStream !== 'undefined');

// Try to use a ReadableStream
try {
  console.log('\nTesting ReadableStream functionality:');
  
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue('Hello');
      controller.enqueue('World');
      controller.close();
    }
  });
  
  console.log('Created ReadableStream successfully:', !!stream);
  
  async function readFromStream() {
    const reader = stream.getReader();
    let result = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      result += value;
    }
    
    console.log('Read from stream:', result);
    console.log('\n✅ ReadableStream is working properly!\n');
  }
  
  readFromStream();
} catch (error) {
  console.error('Error testing ReadableStream:', error);
}

// Test creating a TransformStream
try {
  console.log('\nTesting TransformStream functionality:');
  
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk.toUpperCase());
    }
  });
  
  console.log('Created TransformStream successfully:', !!transformStream);
  console.log('✅ TransformStream created without errors');
} catch (error) {
  console.error('Error testing TransformStream:', error);
}

console.log('\n=== End of Stream Test ===\n'); 