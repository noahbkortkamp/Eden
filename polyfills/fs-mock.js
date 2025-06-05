// Mock for Node.js 'fs' module in React Native
// This prevents Node.js-specific filesystem code from running

module.exports = {
  readFile: () => {
    throw new Error('fs module is not supported in React Native - use expo-file-system instead');
  },
  writeFile: () => {
    throw new Error('fs module is not supported in React Native - use expo-file-system instead');
  },
  readFileSync: () => {
    throw new Error('fs module is not supported in React Native - use expo-file-system instead');
  },
  writeFileSync: () => {
    throw new Error('fs module is not supported in React Native - use expo-file-system instead');
  },
  existsSync: () => {
    throw new Error('fs module is not supported in React Native - use expo-file-system instead');
  },
  mkdirSync: () => {
    throw new Error('fs module is not supported in React Native - use expo-file-system instead');
  }
}; 