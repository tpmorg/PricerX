import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { createMockStoredScan } from "@/features/scans/localScanService";

export default function ScanScreen() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateScan() {
    setIsCreating(true);
    setError(null);

    try {
      const detail = await createMockStoredScan();
      router.push({ pathname: "/items/[id]", params: { id: detail.scan.id } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create scan.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 28, fontWeight: "700" }}>
          Scan, price, remember.
        </Text>
        <Text selectable style={{ color: "#4b5563", fontSize: 16, lineHeight: 22 }}>
          Pricernu starts local. This slice stores a mocked scan, item, and price estimate in SQLite before camera, auth, or cloud enrichment arrive.
        </Text>
      </View>

      <Pressable
        disabled={isCreating}
        onPress={handleCreateScan}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: isCreating ? "#9ca3af" : pressed ? "#111827" : "#0f172a",
          borderRadius: 8,
          padding: 16,
        })}
      >
        {isCreating ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white", fontSize: 17, fontWeight: "700" }}>Create Mock Priced Scan</Text>
        )}
      </Pressable>

      {error ? (
        <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      <View style={{ gap: 12 }}>
        <Link href="/history" asChild>
          <Pressable style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, padding: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>View Scan History</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, padding: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>Settings</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}
