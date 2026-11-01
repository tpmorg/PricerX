import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const enableAppleSignIn = process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN === "true";
  const enableNotifications = process.env.EXPO_PUBLIC_ENABLE_NOTIFICATIONS === "true";
  const plugins = [...(config.plugins ?? [])];

  if (sentryOrg && sentryProject) {
    plugins.push(["@sentry/react-native/expo", { organization: sentryOrg, project: sentryProject }]);
  }

  if (googleIosClientId) {
    plugins.push([
      "@react-native-google-signin/google-signin",
      { iosUrlScheme: googleIosClientId.split(".").reverse().join(".") },
    ]);
  }

  if (enableAppleSignIn) plugins.push("expo-apple-authentication");
  if (enableNotifications) plugins.push("expo-notifications");

  return {
    ...config,
    name: config.name ?? "Pricernu",
    slug: config.slug ?? "pricernu",
    ios: {
      ...config.ios,
      ...(enableAppleSignIn ? { usesAppleSignIn: true } : {}),
    },
    plugins,
    extra: {
      ...config.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      appEnvironment: process.env.EXPO_PUBLIC_APP_ENV ?? process.env.EAS_BUILD_PROFILE ?? "development",
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
      revenueCatEntitlementId: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID,
      revenueCatCreditCode: process.env.EXPO_PUBLIC_REVENUECAT_CREDIT_CODE,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleIosClientId,
      firebaseConfig: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      },
    },
  };
};
