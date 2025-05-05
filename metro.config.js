// Use Expo's default Metro configuration
const { getDefaultConfig } = require('expo/metro-config');

// Get the default configuration
const config = getDefaultConfig(__dirname);

// Export the final config
module.exports = config; 