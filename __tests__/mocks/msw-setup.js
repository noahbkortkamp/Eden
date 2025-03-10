// MSW setup for test environment only
const { setupServer } = require('msw/node');
const { handlers } = require('./msw-handlers');

// Create test server
const server = setupServer(...handlers);

// Configure MSW for tests
beforeAll(() => {
  // Start the interception
  server.listen();
});

afterEach(() => {
  // Reset any runtime request handlers
  server.resetHandlers();
});

afterAll(() => {
  // Stop the interception
  server.close();
});

module.exports = { server }; 