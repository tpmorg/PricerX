import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
        <Stack.Screen name="items/[id]" options={{ title: "Scan Detail" }} />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
