import { ArrowUpRight, Camera, Image as ImageIcon, PackageSearch, Tags } from "lucide-react-native";
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
    <SafeAreaView style={{ backgroundColor: "#f3f4f6", flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 18, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 10 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadItems} tintColor="#111827" />}
      >
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          <Text selectable style={{ color: "#6b7280", fontSize: 13, fontWeight: "700", textTransform: "uppercase" }}>
            Pricernu Library
          </Text>
          <Text selectable style={{ color: "#111827", fontSize: 30, fontWeight: "800" }}>
            Saved Items
          </Text>
          <Text selectable style={{ color: "#4b5563", lineHeight: 21 }}>
            Capture something, review the result, then keep the ones worth tracking.
          </Text>
        </View>

        {isLoading ? <ActivityIndicator color="#111827" /> : null}

        {error ? (
          <View
            style={{
              backgroundColor: "#fef2f2",
              borderColor: "#fecaca",
              borderRadius: 8,
              borderWidth: 1,
              padding: 14,
            }}
          >
            <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
              {error}
            </Text>
          </View>
        ) : null}

        {!isLoading && items.length === 0 ? <EmptyState /> : null}

        {items.map((item, index) => {
          const scanId = item.latestScan?.id ?? item.primaryPhoto?.scanId;
          if (!scanId) return null;

          return (
            <Link key={item.inventoryItem.id} href={{ pathname: "/items/[id]", params: { id: scanId } }} asChild>
              <Pressable
                style={({ pressed }) => ({
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.995 : 1 }],
                })}
              >
                <SavedItemCard item={item} isFeatured={index === 0} />
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#ffffff",
        borderRadius: 8,
        gap: 12,
        justifyContent: "center",
        minHeight: 220,
        paddingHorizontal: 24,
        paddingVertical: 28,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#eef2ff",
          borderRadius: 999,
          height: 56,
          justifyContent: "center",
          width: 56,
        }}
      >
        <PackageSearch color="#4338ca" size={26} strokeWidth={2.25} />
      </View>
      <Text selectable style={{ color: "#111827", fontSize: 22, fontWeight: "800", textAlign: "center" }}>
        Nothing saved yet
      </Text>
      <Text selectable style={{ color: "#4b5563", lineHeight: 21, textAlign: "center" }}>
        Your best captures will land here after you save them from the results screen.
      </Text>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
        <Camera color="#6b7280" size={16} strokeWidth={2.25} />
        <Text selectable style={{ color: "#6b7280", fontSize: 13, fontWeight: "700" }}>
          Use the center camera button to start
        </Text>
      </View>
    </View>
  );
}

function SavedItemCard({ item, isFeatured }: { item: SavedItemSummary; isFeatured: boolean }) {
  const uri = item.primaryPhoto?.imageUri ?? item.latestScan?.imageUri;
  const estimate = item.latestPriceEstimate;
  const title = item.inventoryItem.displayName;
  const subtitle = buildItemSubtitle(item);
  const timestamp = new Date((item.latestScan ?? item.inventoryItem).updatedAt ?? item.inventoryItem.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View
      style={{
        backgroundColor: "#111827",
        borderRadius: 8,
        height: isFeatured ? 280 : 236,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
      }}
    >
      <CardBackground uri={uri} />

      <View
        pointerEvents="none"
        style={{
          ...absoluteFill,
          backgroundColor: "rgba(15, 23, 42, 0.22)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          ...absoluteFill,
          backgroundColor: "rgba(15, 23, 42, 0.18)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            height: "62%",
            backgroundColor: "rgba(15, 23, 42, 0.82)",
          }}
        />
      </View>

      <View
        style={{
          ...absoluteFill,
          justifyContent: "space-between",
          padding: 14,
        }}
      >
        <View style={{ alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, maxWidth: "84%" }}>
            <OverlayPill label={formatSourceBadge(estimate)} tone="primary" />
            <OverlayPill label={timestamp} tone="neutral" />
          </View>
          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.16)",
              borderRadius: 999,
              height: 34,
              justifyContent: "center",
              width: 34,
            }}
          >
            <ArrowUpRight color="#ffffff" size={16} strokeWidth={2.5} />
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {estimate ? (
            <View style={{ alignItems: "flex-start" }}>
              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.92)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text selectable style={{ color: "#111827", fontSize: 15, fontVariant: ["tabular-nums"], fontWeight: "900" }}>
                  {formatRange(estimate)}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ gap: 4 }}>
            <Text selectable numberOfLines={2} style={{ color: "#ffffff", fontSize: isFeatured ? 25 : 22, fontWeight: "800", lineHeight: isFeatured ? 30 : 27 }}>
              {title}
            </Text>
            <Text selectable numberOfLines={2} style={{ color: "rgba(255,255,255,0.82)", lineHeight: 20 }}>
              {subtitle}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function CardBackground({ uri }: { uri: string | undefined }) {
  if (!uri) {
    return (
      <View style={{ ...absoluteFill, alignItems: "center", backgroundColor: "#dbe4ea", gap: 10, justifyContent: "center" }}>
        <ImageIcon color="#64748b" size={26} strokeWidth={2.25} />
        <Text selectable style={{ color: "#475569", fontSize: 13, fontWeight: "700" }}>
          No photo
        </Text>
      </View>
    );
  }

  if (uri.startsWith("mock://")) {
    return (
      <View style={{ ...absoluteFill, alignItems: "center", backgroundColor: "#dbe4ea", gap: 10, justifyContent: "center" }}>
        <Tags color="#475569" size={24} strokeWidth={2.25} />
        <Text selectable style={{ color: "#475569", fontSize: 13, fontWeight: "700" }}>
          Mock capture
        </Text>
      </View>
    );
  }

  return <Image source={{ uri }} style={absoluteFill} resizeMode="cover" />;
}

function OverlayPill({ label, tone }: { label: string; tone: "primary" | "neutral" }) {
  return (
    <View
      style={{
        backgroundColor: tone === "primary" ? "rgba(129, 140, 248, 0.92)" : "rgba(15, 23, 42, 0.48)",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text selectable style={{ color: "#ffffff", fontSize: 12, fontWeight: "800" }}>
        {label}
      </Text>
    </View>
  );
}

function buildItemSubtitle(item: SavedItemSummary): string {
  const parts = [item.inventoryItem.brand, item.inventoryItem.model, item.inventoryItem.category].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "Saved item";
}

function formatSourceBadge(estimate: PriceEstimate | null): string {
  if (!estimate) return "No price";
  return formatSourceLabel(estimate.sourceType);
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

const absoluteFill = {
  bottom: 0,
  left: 0,
  position: "absolute" as const,
  right: 0,
  top: 0,
};
