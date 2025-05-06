module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: {
          'crypto': 'crypto-browserify',
          'stream': 'stream-browserify',
          'util': 'util/',
          'path': 'path-browserify',
          'zlib': 'browserify-zlib',
          'http': '@tradle/react-native-http',
          'https': 'https-browserify',
          'net': 'react-native-tcp',
          'tls': 'react-native-tcp',
          'fs': 'react-native-level-fs',
          'process': 'process/browser',
          'querystring': 'querystring-es3',
          'url': 'react-native-url-polyfill',
          'os': 'os-browserify',
          'constants': 'constants-browserify',
          'vm': 'vm-browserify',
          'domain': 'domain-browser',
          'events': 'events',
          'assert': 'assert',
          'buffer': '@craftzdog/react-native-buffer'
        }
      }],
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "blacklist": null,
        "whitelist": null,
        "safe": false,
        "allowUndefined": true
      }]
    ],
  };
}; 