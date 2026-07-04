import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { brandColors } from "@/theme/brand";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: brandColors.canvas },
          headerStyle: { backgroundColor: brandColors.surface },
          headerTintColor: brandColors.ink,
          headerShadowVisible: false,
          headerTitleStyle: { color: brandColors.ink, fontWeight: "800" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
        <Stack.Screen name="items/[id]" options={{ title: "Scan Detail" }} />
      </Stack>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
