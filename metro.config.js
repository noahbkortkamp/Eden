const { getDefaultConfig } = require('expo/metro-config');
const nodeLibs = require('node-libs-react-native');

// Get the default configuration
const config = getDefaultConfig(__dirname);

// Add the resolver for node polyfills
config.resolver.extraNodeModules = {
  ...nodeLibs,
  // Ensure these specific modules are properly polyfilled
  'crypto': require.resolve('crypto-browserify'),
  'stream': require.resolve('stream-browserify'),
  'util': require.resolve('util/'),
  'path': require.resolve('path-browserify'),
  'zlib': require.resolve('browserify-zlib'),
  'http': require.resolve('@tradle/react-native-http'),
  'https': require.resolve('https-browserify'),
  'fs': require.resolve('react-native-level-fs'),
  'process': require.resolve('process/browser'),
};

// Force use of browser versions of packages
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Explicitly redirect problematic packages
  if (moduleName.startsWith('axios')) {
    return {
      filePath: require.resolve('axios/dist/axios.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle specific node modules
  if (moduleName === 'crypto' || moduleName.startsWith('crypto/')) {
    return {
      filePath: require.resolve('crypto-browserify'),
      type: 'sourceFile',
    };
  }
  
  if (moduleName === 'stream' || moduleName.startsWith('stream/')) {
    return {
      filePath: require.resolve('stream-browserify'),
      type: 'sourceFile',
    };
  }

  if (moduleName === 'util' || moduleName.startsWith('util/')) {
    return {
      filePath: require.resolve('util/'),
      type: 'sourceFile',
    };
  }
  
  // Let Metro handle everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 