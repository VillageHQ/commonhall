import type { ExpoConfig } from "expo/config";

// The Commonhall store app. One app for every fund: the member picks their community on first open.
// Commonhall's own build is published from the Expo account "tinyring" (Apple team TA6D5Y2M2U), TestFlight internal only.
// A fund publishing its own copy sets EAS_PROJECT_ID (from `eas init` on its account) and EAS_OWNER instead.
const projectId = process.env.EAS_PROJECT_ID ?? "963d0817-45b0-4ad9-93fd-7c22efba9c60";
const owner = process.env.EAS_PROJECT_ID ? process.env.EAS_OWNER : "tinyring";

const config: ExpoConfig = {
  name: "Commonhall",
  slug: "commonhall",
  ...(owner ? { owner } : {}),
  scheme: "commonhall",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "ai.commonhall.app",
    supportsTablet: true,
    infoPlist: {
      // Voice rooms keep playing (and a member on stage keeps talking) with the screen locked.
      UIBackgroundModes: ["audio"],
      NSMicrophoneUsageDescription: "Commonhall uses the microphone when you speak in a voice room. Rooms are never recorded.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "ai.commonhall.app",
    adaptiveIcon: {
      backgroundColor: "#fafaf7",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    // The voice service's own permissions come from modules/voice-service (merged at build).
    permissions: ["android.permission.RECORD_AUDIO", "android.permission.MODIFY_AUDIO_SETTINGS", "android.permission.POST_NOTIFICATIONS", "android.permission.BLUETOOTH_CONNECT"],
    blockedPermissions: ["android.permission.CAMERA", "android.permission.RECORD_VIDEO"],
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: "./assets/favicon.png", bundler: "metro" },
  plugins: [
    "expo-dev-client",
    ["expo-notifications", { color: "#111110" }],
    ["@livekit/react-native-expo-plugin", { android: { audioType: "communication" } }],
    ["@config-plugins/react-native-webrtc", { microphonePermission: "Commonhall uses the microphone when you speak in a voice room. Rooms are never recorded." }],
  ],
  experiments: {
    // Only the web preview (scripts/web-preview.mjs) serves the app under a path.
    baseUrl: process.env.EXPO_BASE_URL || undefined,
  },
  extra: { eas: { projectId } },
};

export default config;
