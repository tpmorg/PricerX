import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PricernuFramework } from "@/framework/PricernuFramework";
import { ThemeProvider, lightTheme } from "@/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PricernuFramework>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: lightTheme.colors.background },
              headerStyle: { backgroundColor: lightTheme.colors.surface },
              headerTintColor: lightTheme.colors.text,
              headerShadowVisible: false,
              headerTitleStyle: { color: lightTheme.colors.text, fontWeight: "800" },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="camera" options={{ headerShown: false, presentation: "fullScreenModal" }} />
            <Stack.Screen name="history" options={{ headerShown: false }} />
            <Stack.Screen name="items/[id]" options={{ title: "Scan Detail" }} />
          </Stack>
          <StatusBar style="dark" />
        </PricernuFramework>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
