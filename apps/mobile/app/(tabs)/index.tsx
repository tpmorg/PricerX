import { ArrowUpRight, Camera, Image as ImageIcon, PackageSearch, Tags } from "lucide-react-native";
import type { PriceEstimate } from "@pricernu/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { listSavedItems, type SavedItemSummary } from "@/features/scans/localScanService";
import { useTheme } from "@/theme";

export default function HomeScreen() {
  const theme = useTheme();
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
    <SafeAreaView style={{ backgroundColor: theme.colors.background, flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadItems} tintColor={theme.colors.text} />}
      >
        {isLoading ? <ActivityIndicator color={theme.colors.text} /> : null}

        {error ? (
          <SurfaceCard>
            <Text selectable style={{ color: theme.colors.danger, lineHeight: 20 }}>
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
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.lg,
        gap: 12,
        justifyContent: "center",
        minHeight: 220,
        paddingHorizontal: 24,
        paddingVertical: 28,
        borderColor: theme.colors.border,
        borderWidth: 1,
        boxShadow: theme.shadows.subtle,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.colors.primarySoft,
          borderRadius: 999,
          height: 56,
          justifyContent: "center",
          width: 56,
        }}
      >
        <PackageSearch color={theme.colors.primaryStrong} size={26} strokeWidth={2.25} />
      </View>
      <Text selectable style={{ color: theme.colors.text, fontSize: 22, fontWeight: "800", textAlign: "center" }}>
        Nothing saved yet
      </Text>
      <Text selectable style={{ color: theme.colors.textMuted, lineHeight: 21, textAlign: "center" }}>
        Your best captures will land here after you save them from the results screen.
      </Text>
      <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
        <Camera color={theme.colors.textSoft} size={16} strokeWidth={2.25} />
        <Text selectable style={{ color: theme.colors.textSoft, fontSize: 13, fontWeight: "700" }}>
          Use the center camera button to start
        </Text>
      </View>
    </View>
  );
}

function SavedItemCard({ item, isFeatured }: { item: SavedItemSummary; isFeatured: boolean }) {
  const theme = useTheme();
  const uri = item.primaryPhoto?.imageUri ?? item.latestScan?.imageUri;
  const estimate = item.latestPriceEstimate;
  const providerMix = getEstimateProviderMixLabel(estimate);
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
        backgroundColor: theme.colors.surfaceInverse,
        height: isFeatured ? 228 : 206,
        overflow: "hidden",
        position: "relative",
        boxShadow: theme.shadows.floating,
      }}
    >
      <CardBackground uri={uri} />

      <View
        pointerEvents="none"
        style={{
          ...absoluteFill,
          backgroundColor: theme.colors.overlayTint,
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
            <OverlayPill label={providerMix} tone="primary" />
            <OverlayPill label={timestamp} tone="neutral" />
          </View>
          <View
            style={{
              alignItems: "center",
              backgroundColor: theme.colors.overlayInverseMuted,
              borderRadius: 999,
              height: 30,
              justifyContent: "center",
              width: 30,
            }}
          >
            <ArrowUpRight color={theme.colors.textInverse} size={15} strokeWidth={2.25} />
          </View>
        </View>

        <View
          style={{
            alignSelf: "stretch",
            backgroundColor: theme.colors.overlayInversePanel,
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
                  color: theme.colors.text,
                  fontSize: isFeatured ? 18 : 17,
                  fontWeight: "700",
                  lineHeight: isFeatured ? 22 : 21,
                }}
              >
                {title}
              </Text>
              {subtitle !== "Saved item" ? (
                <Text selectable numberOfLines={1} style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "500", lineHeight: 16 }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>

            {estimate ? (
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: 999,
                  borderWidth: 1,
                  flexShrink: 0,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text selectable style={{ color: theme.colors.text, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "800" }}>
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
  const theme = useTheme();

  if (!uri) {
    return (
      <View style={{ ...absoluteFill, alignItems: "center", backgroundColor: theme.colors.imageFallback, gap: 10, justifyContent: "center" }}>
        <ImageIcon color={theme.colors.textSoft} size={26} strokeWidth={2.25} />
        <Text selectable style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: "700" }}>
          No photo
        </Text>
      </View>
    );
  }

  if (uri.startsWith("mock://")) {
    return (
      <View style={{ ...absoluteFill, alignItems: "center", backgroundColor: theme.colors.imageFallback, gap: 10, justifyContent: "center" }}>
        <Tags color={theme.colors.textMuted} size={24} strokeWidth={2.25} />
        <Text selectable style={{ color: theme.colors.textMuted, fontSize: 13, fontWeight: "700" }}>
          Mock capture
        </Text>
      </View>
    );
  }

  return <Image source={{ uri }} style={absoluteFill} resizeMode="cover" />;
}

function OverlayPill({ label, tone }: { label: string; tone: "primary" | "neutral" }) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: tone === "primary" ? theme.colors.primary : theme.colors.neutralOverlay,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 5,
      }}
    >
      <Text selectable style={{ color: theme.colors.textInverse, fontSize: 11, fontWeight: "800" }}>
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

function getEstimateProviderMixLabel(estimate: PriceEstimate | null): string {
  if (!estimate) return "No price";
  const providers = extractStructuredProviders(estimate);
  if (providers.length === 0) return formatSourceBadge(estimate);
  if (providers.length === 1) return providers[0] ?? formatSourceBadge(estimate);
  if (providers.length === 2) return `${providers[0]} + ${providers[1]}`;
  return `${providers[0]} + ${providers.length - 1} more`;
}

function extractStructuredProviders(estimate: PriceEstimate): string[] {
  if (!estimate.rawEvidenceJson) return [];

  try {
    const parsed = JSON.parse(estimate.rawEvidenceJson) as {
      estimateRawEvidenceJson?: string;
      sources?: Array<{ sourceType?: string }>;
      providerAttempts?: Array<{ status?: string; sourceType?: string }>;
    };
    const providerPayload = parsed.estimateRawEvidenceJson
      ? JSON.parse(parsed.estimateRawEvidenceJson) as {
          sources?: Array<{ sourceType?: string }>;
          providerAttempts?: Array<{ status?: string; sourceType?: string }>;
        }
      : parsed;

    const labels = new Set<string>();

    providerPayload.sources?.forEach((source) => {
      if (source.sourceType === "reverb_listing" || source.sourceType === "ebay_browse" || source.sourceType === "pricecharting") {
        labels.add(formatSourceLabel(source.sourceType));
      }
    });

    providerPayload.providerAttempts?.forEach((attempt) => {
      if (
        attempt.status === "success"
        && (attempt.sourceType === "reverb_listing" || attempt.sourceType === "ebay_browse" || attempt.sourceType === "pricecharting")
      ) {
        labels.add(formatSourceLabel(attempt.sourceType));
      }
    });

    return Array.from(labels);
  } catch {
    return [];
  }
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
