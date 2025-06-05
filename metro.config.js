// Use Expo's default Metro configuration
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default configuration
const config = getDefaultConfig(__dirname);

// Fix platform extensions (adds native-specific resolution)
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure all needed source extensions are supported
config.resolver.sourceExts = [
  'js', 'jsx', 'ts', 'tsx', 'json', 'mjs'
];

// Add explicit node_modules paths for resolution
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Add alias for our custom hooks to replace external packages
config.resolver.alias = {
  '@/hooks': path.resolve(__dirname, 'src/hooks'),
  'use-latest-callback': path.resolve(__dirname, 'src/hooks/useLatestCallback'),
};

// Custom resolver for better alias handling
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'use-latest-callback') {
    return {
      filePath: path.resolve(__dirname, 'src/hooks/useLatestCallback.ts'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Blacklist test files from production builds
config.resolver.blacklistRE = /(__tests__|test-.*|.*\.test\..*|.*\.spec\..*)$/;

// Export the final config
module.exports = config; 