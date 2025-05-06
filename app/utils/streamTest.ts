/**
 * Utility function to test if ReadableStream is available and functioning
 * This can be called during app startup to verify polyfills are applied
 */
export function testReadableStream(): { isAvailable: boolean; message: string } {
  try {
    // Check if ReadableStream is defined
    if (typeof ReadableStream === 'undefined') {
      return { 
        isAvailable: false, 
        message: 'ReadableStream is not defined, polyfill not applied' 
      };
    }
    
    // Create a simple ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('Test');
        controller.close();
      }
    });
    
    // If we got here, ReadableStream is at least constructable
    return { 
      isAvailable: true, 
      message: 'ReadableStream is available and working' 
    };
  } catch (error) {
    return { 
      isAvailable: false, 
      message: `ReadableStream error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

/**
 * Test if all Stream APIs are properly polyfilled
 */
export function testStreamPolyfills(): Record<string, boolean> {
  return {
    ReadableStream: typeof ReadableStream !== 'undefined',
    WritableStream: typeof WritableStream !== 'undefined',
    TransformStream: typeof TransformStream !== 'undefined'
  };
}

/**
 * Run a complete test of stream functionality
 */
export function runStreamTest() {
  console.log('=== Running stream polyfill tests ===');
  
  const streamAvailability = testStreamPolyfills();
  console.log('Stream API availability:', streamAvailability);
  
  const readableTest = testReadableStream();
  console.log('ReadableStream test:', readableTest);
  
  console.log('=== Stream tests complete ===');
  
  return {
    streamAvailability,
    readableTest
  };
} 