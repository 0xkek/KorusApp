module.exports = ({ config }) => {
  // Set the public path for production builds
  if (process.env.NODE_ENV === 'production') {
    config.web = {
      ...config.web,
      publicPath: '/',
    };
  }

  // Add updates configuration for production
  config.updates = {
    ...config.updates,
    url: 'https://korus.app/updates',
    fallbackToCacheTimeout: 0,
  };

  // Ensure proper asset handling
  config.assetBundlePatterns = config.assetBundlePatterns || ['**/*'];

  return config;
};