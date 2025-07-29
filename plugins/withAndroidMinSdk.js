const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidMinSdk(config) {
  return withAppBuildGradle(config, (config) => {
    // Set minSdkVersion to 23 for MWA support
    config.modResults.contents = config.modResults.contents.replace(
      /minSdkVersion\s*=?\s*\d+/g,
      'minSdkVersion = 23'
    );
    return config;
  });
};