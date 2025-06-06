// Use Expo's default Metro configuration
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Critical: React Native 0.79+ configuration
config.transformer = {
  ...config.transformer,
  // Fix for Hermes compilation issues
  minifierConfig: {
    keep_fnames: true,
    mangle: { keep_fnames: true }
  }
};

// Critical: Resolver configuration for production builds
config.resolver = {
  ...config.resolver,
  // Ensure proper module resolution
  alias: {
    // Fix potential import conflicts
    'react-native': 'react-native'
  }
};

// Production-specific optimizations
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    ...config.transformer.minifierConfig,
    // Preserve function names for debugging
    keep_fnames: true,
    mangle: {
      keep_fnames: true
    }
  };
}

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