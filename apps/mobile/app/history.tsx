import type { PriceEstimate } from "@pricernu/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { listSavedItems, type SavedItemSummary } from "@/features/scans/localScanService";

export default function HistoryScreen() {
  const [items, setItems] = useState<SavedItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setError(null);

    try {
      setItems(await listSavedItems());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load saved items.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems]),
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 14 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadItems} />}
    >
      <View style={{ gap: 6 }}>
        <Text selectable style={{ fontSize: 28, fontWeight: "800" }}>
          Saved Items
        </Text>
        <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
          The scans you chose to keep locally, with their latest pricing signal.
        </Text>
      </View>

      {isLoading ? <ActivityIndicator /> : null}

      {error ? (
        <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <View style={{ gap: 8, paddingVertical: 24 }}>
          <Text selectable style={{ fontSize: 20, fontWeight: "700" }}>
            No saved items yet
          </Text>
          <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
            Capture or import a photo, review the result, then tap Save to keep it here.
          </Text>
        </View>
      ) : null}

      {items.map((item) => {
        const scanId = item.latestScan?.id ?? item.primaryPhoto?.scanId;
        if (!scanId) return null;

        return (
          <Link key={item.inventoryItem.id} href={{ pathname: "/items/[id]", params: { id: scanId } }} asChild>
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#f9fafb" : "#ffffff",
                borderColor: "#d1d5db",
                borderRadius: 8,
                borderWidth: 1,
                flexDirection: "row",
                gap: 14,
                overflow: "hidden",
                padding: 12,
              })}
            >
              <SavedItemThumbnail item={item} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text selectable style={{ fontSize: 17, fontWeight: "800" }}>
                  {item.inventoryItem.displayName}
                </Text>
                <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
                  {buildItemSubtitle(item)}
                </Text>
                <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {item.latestPriceEstimate ? (
                    <HistoryPill
                      label={`${formatRange(item.latestPriceEstimate)} • ${formatSourceLabel(item.latestPriceEstimate.sourceType)}`}
                    />
                  ) : (
                    <HistoryPill label="No price yet" />
                  )}
                </View>
                <Text selectable style={{ color: "#6b7280", fontVariant: ["tabular-nums"], lineHeight: 18 }}>
                  {new Date((item.latestScan ?? item.inventoryItem).updatedAt ?? item.inventoryItem.updatedAt).toLocaleString()}
                </Text>
              </View>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}

function SavedItemThumbnail({ item }: { item: SavedItemSummary }) {
  const uri = item.primaryPhoto?.imageUri ?? item.latestScan?.imageUri;
  if (!uri) {
    return (
      <View
        style={{
          alignItems: "center",
          aspectRatio: 1,
          backgroundColor: "#e5e7eb",
          borderRadius: 8,
          justifyContent: "center",
          width: 92,
        }}
      >
        <Text selectable style={{ color: "#6b7280", fontSize: 12, fontWeight: "700" }}>
          No photo
        </Text>
      </View>
    );
  }

  if (uri.startsWith("mock://")) {
    return (
      <View
        style={{
          alignItems: "center",
          aspectRatio: 1,
          backgroundColor: "#e5e7eb",
          borderRadius: 8,
          justifyContent: "center",
          width: 92,
        }}
      >
        <Text selectable style={{ color: "#6b7280", fontSize: 12, fontWeight: "700", textAlign: "center" }}>
          Mock photo
        </Text>
      </View>
    );
  }

  return <Image source={{ uri }} style={{ aspectRatio: 1, backgroundColor: "#e5e7eb", borderRadius: 8, width: 92 }} />;
}

function buildItemSubtitle(item: SavedItemSummary): string {
  const parts = [item.inventoryItem.brand, item.inventoryItem.model, item.inventoryItem.category].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "Saved item";
}

function HistoryPill({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: "#eef2ff", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: "#3730a3", fontSize: 12, fontWeight: "800" }}>{label}</Text>
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

function formatSourceLabel(sourceType: PriceEstimate["sourceType"]): string {
  switch (sourceType) {
    case "reverb_listing":
      return "Reverb";
    case "ebay_browse":
      return "eBay";
    case "pricecharting":
      return "PriceCharting";
    case "brave_discovery":
      return "Brave";
    case "convex_cache":
      return "Cache";
    case "local_cache":
      return "Local cache";
    case "manual":
      return "Manual";
    case "mock":
      return "Mock";
    default:
      return sourceType.replace(/_/g, " ");
  }
}
