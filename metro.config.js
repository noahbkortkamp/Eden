// Use Expo's default Metro configuration
const { getDefaultConfig } = require('expo/metro-config');
const nodeLibsReactNative = require('node-libs-react-native');

// Get the default configuration
const config = getDefaultConfig(__dirname);

// Add polyfill support
config.resolver.extraNodeModules = {
  ...nodeLibsReactNative,
  // Add explicit polyfill for ReadableStream
  stream: require.resolve('stream-browserify'),
};

// Export the final config
module.exports = config; 