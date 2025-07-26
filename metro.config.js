const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs and .mjs files
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs'];

// Add node polyfills
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  crypto: require.resolve('react-native-crypto'),
};

module.exports = config;