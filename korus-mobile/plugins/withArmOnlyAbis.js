/**
 * Restrict the Android build to ARM architectures.
 *
 * The default is `armeabi-v7a,arm64-v8a,x86,x86_64`. The two x86 variants
 * exist for emulators — no shipping Android device runs them — and in the v1
 * dApp Store APK they cost 34 MB of a 75 MB download:
 *
 *   arm64-v8a    16.1 MB      armeabi-v7a  11.2 MB
 *   x86          17.3 MB      x86_64       16.7 MB
 *
 * armeabi-v7a is kept for 32-bit devices on Google Play; the Seeker is arm64.
 *
 * This has to be a plugin rather than an app.config.js field: the setting
 * lives in android/gradle.properties, which `expo prebuild` regenerates from
 * the template on every EAS build, so an edit there would not survive.
 *
 * Note this shrinks the universal APK the dApp Store wants. It does not
 * replace ABI splits or an app bundle, which Google Play uses to serve each
 * device only its own slice.
 */

const { withGradleProperties } = require('@expo/config-plugins');

const ARM_ONLY = 'armeabi-v7a,arm64-v8a';

module.exports = function withArmOnlyAbis(config) {
  return withGradleProperties(config, (cfg) => {
    const existing = cfg.modResults.find(
      (item) => item.type === 'property' && item.key === 'reactNativeArchitectures'
    );

    if (existing) {
      existing.value = ARM_ONLY;
    } else {
      cfg.modResults.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: ARM_ONLY,
      });
    }

    return cfg;
  });
};
