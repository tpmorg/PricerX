import { ArrowUpRight, Camera, Image as ImageIcon, PackageSearch, Tags } from "lucide-react-native";
import type { PriceEstimate } from "@pricernu/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { listSavedItems, type SavedItemSummary } from "@/features/scans/localScanService";
import { brandColors, brandRadii, brandShadows } from "@/theme/brand";

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
    <SafeAreaView style={{ backgroundColor: brandColors.canvas, flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadItems} tintColor={brandColors.ink} />}
      >
        {isLoading ? <ActivityIndicator color={brandColors.ink} /> : null}

        {error ? (
          <SurfaceCard>
            <Text selectable style={{ color: brandColors.danger, lineHeight: 20 }}>
              {error}
            </Text>
          </SurfaceCard>
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
        backgroundColor: brandColors.surface,
        borderRadius: brandRadii.lg,
        gap: 12,
        justifyContent: "center",
        minHeight: 220,
        paddingHorizontal: 24,
        paddingVertical: 28,
        borderColor: brandColors.line,
        borderWidth: 1,
        boxShadow: brandShadows.subtle,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: brandColors.primarySoft,
          borderRadius: 999,
          height: 56,
          justifyContent: "center",
          width: 56,
        }}
      >
        <PackageSearch color={brandColors.primaryStrong} size={26} strokeWidth={2.25} />
      </View>
      <Text selectable style={{ color: brandColors.ink, fontSize: 22, fontWeight: "800", textAlign: "center" }}>
        Nothing saved yet
      </Text>
      <Text selectable style={{ color: brandColors.inkMuted, lineHeight: 21, textAlign: "center" }}>
        Your best captures will land here after you save them from the results screen.
      </Text>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
        <Camera color={brandColors.inkSoft} size={16} strokeWidth={2.25} />
        <Text selectable style={{ color: brandColors.inkSoft, fontSize: 13, fontWeight: "700" }}>
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
        backgroundColor: brandColors.ink,
        height: isFeatured ? 228 : 206,
        overflow: "hidden",
        position: "relative",
        boxShadow: brandShadows.floating,
      }}
    >
      <CardBackground uri={uri} />

      <View
        pointerEvents="none"
        style={{
          ...absoluteFill,
          backgroundColor: "rgba(17, 27, 38, 0.08)",
        }}
      />

      <View
        style={{
          ...absoluteFill,
          justifyContent: "space-between",
          padding: 12,
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
              backgroundColor: "rgba(255,255,255,0.24)",
              borderRadius: 999,
              height: 30,
              justifyContent: "center",
              width: 30,
            }}
          >
            <ArrowUpRight color="#ffffff" size={15} strokeWidth={2.25} />
          </View>
        </View>

        <View
          style={{
            alignSelf: "stretch",
            backgroundColor: "rgba(255,255,255,0.92)",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                selectable
                numberOfLines={2}
                style={{
                  color: brandColors.ink,
                  fontSize: isFeatured ? 18 : 17,
                  fontWeight: "700",
                  lineHeight: isFeatured ? 22 : 21,
                }}
              >
                {title}
              </Text>
              {subtitle !== "Saved item" ? (
                <Text selectable numberOfLines={1} style={{ color: brandColors.inkMuted, fontSize: 12, fontWeight: "500", lineHeight: 16 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            {estimate ? (
              <View
                style={{
                  backgroundColor: brandColors.surface,
                  borderColor: brandColors.line,
                  borderRadius: 999,
                  borderWidth: 1,
                  flexShrink: 0,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text selectable style={{ color: brandColors.ink, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "800" }}>
                  {formatRange(estimate)}
                </Text>
              </View>
            ) : null}
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
        <ImageIcon color={brandColors.inkSoft} size={26} strokeWidth={2.25} />
        <Text selectable style={{ color: brandColors.inkMuted, fontSize: 13, fontWeight: "700" }}>
          No photo
        </Text>
      </View>
    );
  }

  if (uri.startsWith("mock://")) {
    return (
      <View style={{ ...absoluteFill, alignItems: "center", backgroundColor: "#dbe4ea", gap: 10, justifyContent: "center" }}>
        <Tags color={brandColors.inkMuted} size={24} strokeWidth={2.25} />
        <Text selectable style={{ color: brandColors.inkMuted, fontSize: 13, fontWeight: "700" }}>
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
        backgroundColor: tone === "primary" ? brandColors.primary : "rgba(17, 27, 38, 0.52)",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 5,
      }}
    >
      <Text selectable style={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}>
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
