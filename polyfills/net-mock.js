// Mock for Node.js 'net' module in React Native
// This prevents Node.js-specific networking code from running

module.exports = {
  createConnection: () => {
    throw new Error('net module is not supported in React Native');
  },
  createServer: () => {
    throw new Error('net module is not supported in React Native');
  },
  connect: () => {
    throw new Error('net module is not supported in React Native');
  },
  Server: class MockServer {
    constructor() {
      throw new Error('net.Server is not supported in React Native');
    }
  },
  Socket: class MockSocket {
    constructor() {
      throw new Error('net.Socket is not supported in React Native');
    }
  }
}; 