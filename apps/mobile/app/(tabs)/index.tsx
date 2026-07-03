import { ChevronRight, Image as ImageIcon, PackageSearch, Tags } from "lucide-react-native";
import type { PriceEstimate } from "@pricernu/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listSavedItems, type SavedItemSummary } from "@/features/scans/localScanService";

export default function HomeScreen() {
  const [items, setItems] = useState<SavedItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setError(null);

    try {
      setItems(await listSavedItems(12));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load recent captures.");
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
    <SafeAreaView style={{ backgroundColor: "#ffffff", flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadItems} />}
      >
        <View style={{ gap: 6 }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
            <PackageSearch color="#111827" size={24} strokeWidth={2.25} />
            <Text selectable style={{ fontSize: 28, fontWeight: "800" }}>
              Recent Captures
            </Text>
          </View>
          <Text selectable style={{ color: "#4b5563", lineHeight: 21 }}>
            Saved scans live here. Capture from the center button, review the result, then save anything worth keeping.
          </Text>
        </View>

        {isLoading ? <ActivityIndicator /> : null}

        {error ? (
          <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
            {error}
          </Text>
        ) : null}

        {!isLoading && items.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                borderColor: "#d1d5db",
                borderRadius: 8,
                borderWidth: 1,
                gap: 8,
                justifyContent: "center",
                padding: 16,
              }}
            >
              <ImageIcon color="#9ca3af" size={28} strokeWidth={2.25} />
              <Text selectable style={{ fontSize: 20, fontWeight: "700" }}>
                Nothing saved yet
              </Text>
            <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
              Your first few good captures will show up here after you save them from the results screen.
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
                  <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                    <Text selectable style={{ color: "#6b7280", fontVariant: ["tabular-nums"], lineHeight: 18 }}>
                      {new Date((item.latestScan ?? item.inventoryItem).updatedAt ?? item.inventoryItem.updatedAt).toLocaleString()}
                    </Text>
                    <ChevronRight color="#9ca3af" size={18} strokeWidth={2.25} />
                  </View>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </SafeAreaView>
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
        <ImageIcon color="#6b7280" size={18} strokeWidth={2.25} />
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
        <Tags color="#6b7280" size={18} strokeWidth={2.25} />
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
