const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfill for Node.js modules
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
  stream: require.resolve('stream-browserify'),
  crypto: require.resolve('crypto-browserify'),
  process: require.resolve('process/browser'),
  util: require.resolve('util'),
};

// Add support for .cjs files
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Resolve specific problematic modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@solana/web3.js/node_modules/buffer')) {
    return {
      filePath: require.resolve('buffer'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;