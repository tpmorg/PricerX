import type { PriceEstimate } from "@pricernu/shared";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { getPricingProviderStatus } from "@/features/pricing/localPricingService";
import {
  deleteScan,
  getStoredScanDetail,
  refreshStoredScanPricing,
  type StoredScanDetail,
} from "@/features/scans/localScanService";

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<StoredScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pricingProvider = getPricingProviderStatus();

  const loadScan = useCallback(async () => {
    if (!id) return;
    setError(null);

    try {
      setDetail(await getStoredScanDetail(id));
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

  async function handleRefreshPricing() {
    if (!id) return;
    setIsRefreshingPrice(true);
    setError(null);

    try {
      const nextDetail = await refreshStoredScanPricing(id);
      setDetail(nextDetail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh pricing.");
    } finally {
      setIsRefreshingPrice(false);
    }
  }

  const scan = detail?.scan;
  const item = detail?.inventoryItem;
  const estimate = detail?.latestPriceEstimate;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16 }}>
      {isLoading ? <ActivityIndicator /> : null}

      {error ? (
        <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      {!isLoading && !detail ? (
        <Text selectable style={{ color: "#4b5563", fontSize: 16 }}>
          Scan not found.
        </Text>
      ) : null}

      {scan ? (
        <>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ fontSize: 22, fontWeight: "700" }}>
              {item?.displayName ?? scan.ocrText ?? "Local scan"}
            </Text>
            <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
              Stored locally in SQLite with linked scan, inventory, and pricing records.
            </Text>
          </View>

          {scan.imageUri.startsWith("mock://") ? (
            <View
              style={{
                alignItems: "center",
                aspectRatio: 4 / 3,
                backgroundColor: "#e5e7eb",
                borderRadius: 8,
                justifyContent: "center",
              }}
            >
              <Text selectable style={{ color: "#4b5563", fontSize: 16, fontWeight: "600" }}>
                Mock image placeholder
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: scan.imageUri }}
              style={{ aspectRatio: 4 / 3, backgroundColor: "#e5e7eb", borderRadius: 8, width: "100%" }}
            />
          )}

          <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
            <Field label="Brand" value={item?.brand ?? "Unknown"} />
            <Field label="Model" value={item?.model ?? "Unknown"} />
            <Field label="Category" value={item?.category ?? "Unknown"} />
            <Field label="Status" value={scan.recognitionStatus} />
            <Field label="Confidence" value={`${Math.round((scan.recognitionConfidence ?? 0) * 100)}%`} />
            <Field label="Image URI" value={scan.imageUri} />
            <Field label="Captured" value={new Date(scan.capturedAt).toLocaleString()} />
            <Field label="Sync" value={scan.syncStatus} />
          </View>

          <PriceCard estimate={estimate} />

          <Pressable
            disabled={isRefreshingPrice || !item}
            onPress={() => void handleRefreshPricing()}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: isRefreshingPrice ? "#9ca3af" : pressed ? "#111827" : "#0f172a",
              borderRadius: 8,
              padding: 14,
            })}
          >
            {isRefreshingPrice ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
                {pricingProvider.mode === "convex_brave" ? "Refresh Pricing with Brave" : "Re-run Local Pricing"}
              </Text>
            )}
          </Pressable>

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

function PriceCard({ estimate }: { estimate: PriceEstimate | null | undefined }) {
  if (!estimate) {
    return (
      <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 6, padding: 14 }}>
        <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
          No price estimate yet
        </Text>
        <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
          Pricing will appear here after local cache or cloud enrichment runs.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
      <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
        Value Range
      </Text>
      <Field label="Estimate" value={formatRange(estimate)} />
      <Field label="Suggested list" value={formatMoney(estimate.suggestedListPrice, estimate.currency)} />
      <Field label="Suggested buy" value={formatMoney(estimate.suggestedBuyPrice, estimate.currency)} />
      <Field label="Source" value={estimate.sourceType} />
      <Field label="Credit cost" value={String(estimate.creditCost)} />
      <Field label="Confidence" value={formatConfidence(estimate.confidence)} />
      <Field label="Evidence" value={estimate.evidenceSummary ?? "No evidence summary."} />
    </View>
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

function formatRange(estimate: PriceEstimate): string {
  const low = formatMoney(estimate.lowPrice, estimate.currency);
  const high = formatMoney(estimate.highPrice, estimate.currency);
  if (low === "Unknown" && high === "Unknown") return "Unknown";
  return `${low} - ${high}`;
}

function formatMoney(value: number | undefined, currency: string): string {
  if (value === undefined) return "Unknown";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatConfidence(value: number | undefined): string {
  if (value === undefined) return "Unknown";
  return `${Math.round(value * 100)}%`;
}
