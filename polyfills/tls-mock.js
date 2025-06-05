// Mock for Node.js 'tls' module in React Native
// This prevents Node.js-specific TLS code from running

module.exports = {
  connect: () => {
    throw new Error('tls module is not supported in React Native');
  },
  createServer: () => {
    throw new Error('tls module is not supported in React Native');
  },
  TLSSocket: class MockTLSSocket {
    constructor() {
      throw new Error('tls.TLSSocket is not supported in React Native');
    }
  },
  Server: class MockTLSServer {
    constructor() {
      throw new Error('tls.Server is not supported in React Native');
    }
  }
}; 