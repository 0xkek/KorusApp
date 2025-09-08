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

// Disable async requires for production builds to avoid chunk loading issues
if (process.env.NODE_ENV === 'production') {
  config.transformer = {
    ...config.transformer,
    asyncRequireModulePath: null,
  };
}

// Ensure proper minification settings
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;