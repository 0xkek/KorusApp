const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfill for Node.js modules
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: 'buffer',
  stream: 'stream-browserify',
  crypto: 'crypto-browserify',
};

module.exports = config;