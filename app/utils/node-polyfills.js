// Empty implementations for Node.js modules that might be imported
// This helps with code that tries to import Node.js modules but doesn't actually use them

// crypto polyfill
export const createHash = () => ({
  update: () => ({
    digest: () => '',
  }),
});

export const randomBytes = () => new Uint8Array(0);

// stream polyfill
export class Readable {
  pipe() { return this; }
  on() { return this; }
  once() { return this; }
}

export class Writable {
  write() { return true; }
  end() {}
  on() { return this; }
}

export class Duplex extends Readable {
  write() { return true; }
  end() {}
}

// util polyfill
export const promisify = (fn) => (...args) => 
  Promise.resolve(fn ? fn(...args) : null);

export const inspect = (obj) => JSON.stringify(obj);

// fs polyfill
export const readFile = () => Promise.resolve('');
export const writeFile = () => Promise.resolve();

// Export default objects for CommonJS require
export default {
  crypto: { createHash, randomBytes },
  stream: { Readable, Writable, Duplex },
  util: { promisify, inspect },
  fs: { readFile, writeFile },
}; 