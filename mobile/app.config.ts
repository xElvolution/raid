import type { ExpoConfig } from 'expo/config';

// Env-driven: EXPO_PUBLIC_API_URL / EXPO_PUBLIC_WEB_URL are inlined at build time (set per EAS profile in eas.json).
const config: ExpoConfig = {
  name: 'Called',
  slug: 'called',
  scheme: 'called',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#000000',
  ios: {
    bundleIdentifier: 'app.called.mobile',
    buildNumber: '1',
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    infoPlist: { NSFaceIDUsageDescription: 'Unlock Called with Face ID.' },
  },
  android: {
    package: 'app.called.mobile',
    versionCode: 1,
    adaptiveIcon: { backgroundColor: '#000000', foregroundImage: './assets/android-icon-foreground.png', backgroundImage: './assets/android-icon-background.png', monochromeImage: './assets/android-icon-monochrome.png' },
    predictiveBackGestureEnabled: false,
    permissions: ['VIBRATE'],
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-web-browser',
    'expo-secure-store',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: '#000000', dark: { backgroundColor: '#000000' } }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://called.5.189.170.85.sslip.io',
    webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'https://called.5.189.170.85.sslip.io',
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
  owner: process.env.EXPO_OWNER,
};
export default config;
