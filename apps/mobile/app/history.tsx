import type { Scan } from "@pricernu/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { listRecentScans } from "@/features/scans/localScanService";

export default function HistoryScreen() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScans = useCallback(async () => {
    setError(null);

    try {
      setScans(await listRecentScans());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load scans.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadScans();
    }, [loadScans]),
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 14 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadScans} />}
    >
      {isLoading ? <ActivityIndicator /> : null}

      {error ? (
        <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      {!isLoading && scans.length === 0 ? (
        <View style={{ gap: 8, paddingVertical: 24 }}>
          <Text selectable style={{ fontSize: 20, fontWeight: "700" }}>
            No scans yet
          </Text>
          <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
            Create a mock local scan from the home screen to exercise SQLite persistence.
          </Text>
        </View>
      ) : null}

      {scans.map((scan) => (
        <Link key={scan.id} href={{ pathname: "/items/[id]", params: { id: scan.id } }} asChild>
          <Pressable style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 6, padding: 14 }}>
            <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
              {scan.ocrText ?? "Local scan"}
            </Text>
            <Text selectable style={{ color: "#4b5563" }}>
              {scan.recognitionStatus} · {Math.round((scan.recognitionConfidence ?? 0) * 100)}% confidence
            </Text>
            <Text selectable style={{ color: "#6b7280", fontVariant: ["tabular-nums"] }}>
              {new Date(scan.capturedAt).toLocaleString()}
            </Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}
