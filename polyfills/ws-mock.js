// Mock for the 'ws' package in React Native
// This is needed because Supabase Realtime conditionally imports 'ws' for Node.js
// but in React Native, the built-in WebSocket is used instead

// Simple mock that won't be used but allows imports to succeed
class MockWebSocket {
  constructor() {
    throw new Error('ws package should not be used in React Native - use built-in WebSocket instead');
  }
}

module.exports = MockWebSocket;
module.exports.default = MockWebSocket; 