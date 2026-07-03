import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resetAllLocalData } from "@/features/scans/localScanService";

export default function SettingsScreen() {
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function confirmReset() {
    if (isResetting) return;

    Alert.alert(
      "Reset local data?",
      "This will permanently delete saved items, scans, photos, pricing results, and staged unsaved results on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            void handleReset();
          },
        },
      ],
    );
  }

  async function handleReset() {
    setIsResetting(true);
    setMessage(null);
    setError(null);

    try {
      await resetAllLocalData();
      setMessage("Local app data cleared.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not clear local data.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SafeAreaView style={{ backgroundColor: "#ffffff", flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 32, paddingTop: 12 }}>
        <View style={{ gap: 8 }}>
          <Text selectable style={{ fontSize: 22, fontWeight: "700" }}>
            Local-first settings
          </Text>
          <Text selectable style={{ color: "#4b5563", fontSize: 16, lineHeight: 22 }}>
            Account sync, cloud enrichment, and credits are intentionally absent from this slice. Local scans should remain useful without any backend.
          </Text>
        </View>

        <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
          <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
            Storage
          </Text>
          <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
            SQLite is the source of truth for saved items, scans, and pricing history on this device.
          </Text>

          <Pressable
            disabled={isResetting}
            onPress={confirmReset}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: isResetting ? "#fca5a5" : pressed ? "#991b1b" : "#dc2626",
              borderRadius: 8,
              padding: 14,
            })}
          >
            {isResetting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Reset Local Data</Text>
            )}
          </Pressable>

          <Text selectable style={{ color: "#6b7280", fontSize: 13, lineHeight: 18 }}>
            Clears saved items, scan history, pricing rows, saved photos, recognition/OCR records, and unsaved staged results.
          </Text>

          {message ? (
            <Text selectable style={{ color: "#166534", lineHeight: 20 }}>
              {message}
            </Text>
          ) : null}

          {error ? (
            <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
