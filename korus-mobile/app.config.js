/**
 * Expo config.
 *
 * A .js config rather than app.json because google-services.json is not in the
 * repo — it identifies the Firebase project and this repo is public. EAS cloud
 * builds get it from a file secret (GOOGLE_SERVICES_JSON), which is exposed as
 * a path at build time; local builds fall back to the file on disk.
 *
 * Create the secret with:
 *   eas env:create --name GOOGLE_SERVICES_JSON --type file \
 *     --value ./google-services.json --visibility secret --environment production
 */

const config = {
  "name": "Korus",
  "slug": "KorusApp",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/icon.png",
  "scheme": "korus",
  "userInterfaceStyle": "dark",
  "newArchEnabled": true,
  "splash": {
    "backgroundColor": "#0a0a0a",
    "resizeMode": "contain",
    "image": "./assets/splash-icon.png"
  },
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "fun.korus.app"
  },
  "android": {
    "package": "fun.korus.app",
    /*
     * `permissions` ADDS to Expo's default manifest template; it does not
     * replace it. Removing a default therefore requires blockedPermissions,
     * which strips it back out after the merge.
     *
     * The template ships SYSTEM_ALERT_WINDOW, VIBRATE and READ/WRITE_EXTERNAL_
     * STORAGE under a comment reading "OPTIONAL PERMISSIONS, REMOVE WHATEVER
     * YOU DO NOT NEED". Korus uses none of them: no image picker, no media
     * library, no haptics.
     *
     * SYSTEM_ALERT_WINDOW is the one that actually matters. It grants drawing
     * over other apps — the tap-jacking vector for spoofing a wallet approval
     * dialog — and the dApp Store flags it as sensitive. A wallet-signing app
     * requesting it invites exactly the scrutiny it should avoid. (React
     * Native's debug manifest declares it too, for the dev overlay; that
     * variant is debug-only and never ships.)
     */
    "permissions": [
      "android.permission.INTERNET",
      // @react-native-community/netinfo, for the offline banner.
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE"
    ],
    "blockedPermissions": [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.VIBRATE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE"
    ],
    "adaptiveIcon": {
      "backgroundColor": "#0a0a0a",
      "foregroundImage": "./assets/android-icon-foreground.png",
      "backgroundImage": "./assets/android-icon-background.png",
      "monochromeImage": "./assets/android-icon-monochrome.png"
    },
    "predictiveBackGestureEnabled": false,
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "https",
            "host": "korus.fun",
            "pathPrefix": "/post"
          }
        ],
        "category": [
          "BROWSABLE",
          "DEFAULT"
        ]
      }
    ],
    "googleServicesFile": "./google-services.json"
  },
  "web": {
    "favicon": "./assets/favicon.png"
  },
  "plugins": [
    "expo-notifications",
    // Drops the x86/x86_64 slices, which are emulator-only. See the plugin.
    "./plugins/withArmOnlyAbis"
  ],
  "owner": "kingkitty",
  "extra": {
    "eas": {
      "projectId": "6f182b5a-61e8-4be6-83a4-0accb8873ca3"
    }
  }
};

module.exports = () => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
