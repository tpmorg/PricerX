import type { Scan } from "@pricernu/shared";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { deleteScan, getScanById } from "@/features/scans/localScanService";

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScan = useCallback(async () => {
    if (!id) return;
    setError(null);

    try {
      setScan(await getScanById(id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load scan.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadScan();
    }, [loadScan]),
  );

  async function handleDelete() {
    if (!id) return;
    setIsDeleting(true);
    setError(null);

    try {
      await deleteScan(id);
      router.replace("/history");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete scan.");
      setIsDeleting(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16 }}>
      {isLoading ? <ActivityIndicator /> : null}

      {error ? (
        <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      {!isLoading && !scan ? (
        <Text selectable style={{ color: "#4b5563", fontSize: 16 }}>
          Scan not found.
        </Text>
      ) : null}

      {scan ? (
        <>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ fontSize: 22, fontWeight: "700" }}>
              {scan.ocrText ?? "Local scan"}
            </Text>
            <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
              Stored locally in SQLite. Recognition and pricing will hang off this record in later slices.
            </Text>
          </View>

          <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
            <Field label="Status" value={scan.recognitionStatus} />
            <Field label="Confidence" value={`${Math.round((scan.recognitionConfidence ?? 0) * 100)}%`} />
            <Field label="Image URI" value={scan.imageUri} />
            <Field label="Captured" value={new Date(scan.capturedAt).toLocaleString()} />
            <Field label="Sync" value={scan.syncStatus} />
          </View>

          <Pressable
            disabled={isDeleting}
            onPress={handleDelete}
            style={({ pressed }) => ({
              alignItems: "center",
              borderColor: pressed ? "#991b1b" : "#dc2626",
              borderRadius: 8,
              borderWidth: 1,
              padding: 14,
            })}
          >
            <Text style={{ color: "#dc2626", fontSize: 16, fontWeight: "700" }}>
              {isDeleting ? "Deleting..." : "Delete Local Scan"}
            </Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text selectable style={{ color: "#6b7280", fontSize: 13, fontWeight: "700" }}>
        {label}
      </Text>
      <Text selectable style={{ color: "#111827", lineHeight: 20 }}>
        {value}
      </Text>
    </View>
  );
}
