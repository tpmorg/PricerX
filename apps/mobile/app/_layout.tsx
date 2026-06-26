import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Pricernu" }} />
        <Stack.Screen name="history" options={{ title: "Scan History" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="items/[id]" options={{ title: "Scan Detail" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
