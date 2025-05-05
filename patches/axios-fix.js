/**
 * Simple Axios Fix for SDK 53
 * This provides a compatibility layer without aggressive monkey patching
 */

console.log('🔧 Applying simple axios fix for SDK 53');

// Try to import our API wrapper
let axiosImpl;
try {
  axiosImpl = require('../app/utils/api-wrapper').default;
} catch (e) {
  try {
    axiosImpl = require('./app/utils/api-wrapper').default;
  } catch (e2) {
    // Create a minimal implementation
    axiosImpl = {
      get: (url, config) => fetch(url, config).then(r => r.json()),
      post: (url, data, config) => fetch(url, { 
        method: 'POST', 
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        ...config
      }).then(r => r.json()),
      put: (url, data, config) => fetch(url, { 
        method: 'PUT', 
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        ...config
      }).then(r => r.json()),
      delete: (url, config) => fetch(url, { 
        method: 'DELETE',
        ...config 
      }).then(r => r.json()),
      request: (config) => fetch(config.url, {
        method: config.method || 'GET',
        body: config.data ? JSON.stringify(config.data) : undefined,
        headers: config.headers || { 'Content-Type': 'application/json' }
      }).then(r => r.json()),
      defaults: {
        headers: {
          common: { 'Accept': 'application/json' },
          post: { 'Content-Type': 'application/json' }
        }
      }
    };
    
    console.log('⚠️ Using fetch-based axios implementation');
  }
}

// Make sure the default export references the main export
axiosImpl.default = axiosImpl;

// Create simple interceptor manager
function createInterceptorManager() {
  const handlers = [];
  
  return {
    handlers,
    use: (fulfilled, rejected) => {
      const id = handlers.length;
      handlers.push({ fulfilled, rejected });
      return id;
    },
    eject: (id) => {
      if (handlers[id]) {
        handlers[id] = null;
      }
    },
    forEach: (fn) => {
      handlers.forEach((handler) => {
        if (handler !== null) {
          fn(handler);
        }
      });
    }
  };
}

// Ensure interceptors property exists
if (!axiosImpl.interceptors) {
  axiosImpl.interceptors = {
    request: createInterceptorManager(),
    response: createInterceptorManager()
  };
}

// Ensure create method exists
if (!axiosImpl.create) {
  axiosImpl.create = function(config) {
    return {
      ...axiosImpl,
      defaults: {
        ...axiosImpl.defaults,
        ...config
      },
      interceptors: {
        request: createInterceptorManager(),
        response: createInterceptorManager()
      }
    };
  };
}

console.log('✅ Simple axios fix applied successfully');

// Export the implementation
module.exports = axiosImpl; 