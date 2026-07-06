import type { PriceEstimate } from "@pricernu/shared";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { getPricingProviderStatus } from "@/features/pricing/localPricingService";
import {
  deleteScan,
  getStoredScanDetail,
  refreshStoredScanPricing,
  saveStoredScan,
  type StoredScanDetail,
  updateStoredScanTitle,
} from "@/features/scans/localScanService";

export default function ScanDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<StoredScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshingPrice, setIsRefreshingPrice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
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

  useEffect(() => {
    setTitleDraft(detail?.inventoryItem?.displayName ?? "");
  }, [detail?.inventoryItem?.displayName]);

  async function syncTitleIfNeeded(): Promise<StoredScanDetail | null> {
    if (!id || !detail?.inventoryItem) return detail;

    const trimmedTitle = titleDraft.trim();
    const currentTitle = detail.inventoryItem.displayName;
    if (!trimmedTitle) {
      setTitleDraft(currentTitle);
      return detail;
    }
    if (trimmedTitle === currentTitle) {
      return detail;
    }

    setIsUpdatingTitle(true);
    try {
      const nextDetail = await updateStoredScanTitle(id, trimmedTitle);
      if (nextDetail) {
        setDetail(nextDetail);
      }
      return nextDetail;
    } finally {
      setIsUpdatingTitle(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setIsDeleting(true);
    setError(null);

    try {
      await deleteScan(id);
      router.replace("/");
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
      const nextDetailAfterTitle = await syncTitleIfNeeded();
      const fallbackQuery = nextDetailAfterTitle?.inventoryItem?.displayName ?? detail?.inventoryItem?.displayName ?? "";
      const manualQuery = titleDraft.trim() || fallbackQuery.trim();
      const nextDetail = await refreshStoredScanPricing(id, manualQuery ? { query: manualQuery } : undefined);
      setDetail(nextDetail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh pricing.");
    } finally {
      setIsRefreshingPrice(false);
    }
  }

  async function handleSave() {
    if (!id) return;
    setIsSaving(true);
    setError(null);

    try {
      await syncTitleIfNeeded();
      const nextDetail = await saveStoredScan(id);
      setDetail(nextDetail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save scan.");
    } finally {
      setIsSaving(false);
    }
  }

  const scan = detail?.scan;
  const item = detail?.inventoryItem;
  const estimate = detail?.latestPriceEstimate;
  const currentTitle = item?.displayName ?? "";
  const trimmedTitleDraft = titleDraft.trim();
  const hasPendingTitleChange = Boolean(item && trimmedTitleDraft && trimmedTitleDraft !== currentTitle);
  const isTitleActionDisabled = isUpdatingTitle || isRefreshingPrice || isSaving || !hasPendingTitleChange;

  async function handleApplyTitleAndRefreshPricing() {
    if (!id || !item || !trimmedTitleDraft) return;
    setError(null);
    setIsRefreshingPrice(true);

    try {
      const nextDetailAfterTitle = await syncTitleIfNeeded();
      const manualQuery = trimmedTitleDraft || nextDetailAfterTitle?.inventoryItem?.displayName || currentTitle;
      const nextDetail = await refreshStoredScanPricing(id, manualQuery ? { query: manualQuery } : undefined);
      setDetail(nextDetail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update title and refresh pricing.");
    } finally {
      setIsRefreshingPrice(false);
    }
  }

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.surface, flex: 1 }} edges={["left", "right", "bottom"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }}>
      {isLoading ? <ActivityIndicator /> : null}

      {error ? (
        <Text selectable style={{ color: theme.colors.danger, lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      {!isLoading && !detail ? (
        <Text selectable style={{ color: theme.colors.textMuted, fontSize: 16 }}>
          Scan not found.
        </Text>
      ) : null}

      {scan ? (
        <>
          <View style={{ gap: 8 }}>
            <Text selectable style={{ fontSize: 28, fontWeight: "800" }}>
              {item?.displayName ?? scan.ocrText ?? "Local scan"}
            </Text>
            <Text selectable style={{ color: theme.colors.textMuted, fontSize: 16, lineHeight: 22 }}>
              {estimate ? `${formatRange(estimate)} from ${formatSourceLabel(estimate.sourceType)}` : "Ready to search marketplace evidence."}
            </Text>
          </View>

          {scan.imageUri.startsWith("mock://") ? (
            <View
              style={{
                alignItems: "center",
                aspectRatio: 4 / 3,
                backgroundColor: theme.colors.neutralSurfaceStrong,
                borderRadius: 8,
                justifyContent: "center",
              }}
            >
              <Text selectable style={{ color: theme.colors.textMuted, fontSize: 16, fontWeight: "600" }}>
                Mock image placeholder
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: scan.imageUri }}
              style={{ aspectRatio: 4 / 3, backgroundColor: theme.colors.neutralSurfaceStrong, borderRadius: 8, width: "100%" }}
            />
          )}

          <FlowCard scan={scan} hasIdentity={Boolean(item)} estimate={estimate} />

          {!detail.isSaved ? (
            <View style={{ backgroundColor: theme.colors.infoSoft, borderColor: theme.colors.infoBorder, borderRadius: 8, borderWidth: 1, gap: 8, padding: 14 }}>
              <Text selectable style={{ color: theme.colors.info, fontSize: 16, fontWeight: "800" }}>
                Unsaved result
              </Text>
              <Text selectable style={{ color: theme.colors.infoStrong, lineHeight: 20 }}>
                This photo and its analysis are staged only. Nothing has been written to the local database yet.
              </Text>
            </View>
          ) : null}

          {item ? (
            <View style={{ backgroundColor: theme.colors.neutralSurface, borderColor: theme.colors.neutralBorder, borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
              <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
                Exact item title
              </Text>
              <Text selectable style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
                If the AI only found something generic, tell us exactly what it is here. We will use this title for marketplace search.
              </Text>
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSaving && !isRefreshingPrice && !isUpdatingTitle}
                onChangeText={setTitleDraft}
                placeholder="Add item title"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.neutralBorder,
                  borderRadius: 8,
                  borderWidth: 1,
                  color: theme.colors.neutralStrong,
                  fontSize: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
                value={titleDraft}
              />
              {hasPendingTitleChange ? (
                <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
                  <Pressable
                    disabled={isTitleActionDisabled}
                    onPress={() => void handleApplyTitleAndRefreshPricing()}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor: isTitleActionDisabled ? theme.colors.disabled : pressed ? theme.colors.primaryStrong : theme.colors.primary,
                      borderRadius: theme.radii.md,
                      justifyContent: "center",
                      minHeight: 44,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    })}
                  >
                    {isRefreshingPrice ? (
                      <ActivityIndicator color={theme.colors.textInverse} />
                    ) : (
                      <Text style={{ color: theme.colors.textInverse, fontSize: 15, fontWeight: "800" }}>Update Now</Text>
                    )}
                  </Pressable>
                  <Text selectable style={{ color: theme.colors.textSoft, flex: 1, fontSize: 13, lineHeight: 18 }}>
                    Use this title right away for a fresh marketplace search.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ backgroundColor: theme.colors.neutralSurface, borderColor: theme.colors.neutralBorder, borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
            <Field label="Confidence" value={`${Math.round((scan.recognitionConfidence ?? 0) * 100)}%`} />
          </View>

          <PriceCard estimate={estimate} />
          <EvidenceSection estimate={estimate} />

          {!detail.isSaved ? (
            <Pressable
              disabled={isSaving}
            onPress={() => void handleSave()}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: isSaving ? theme.colors.disabled : pressed ? theme.colors.neutralStrong : theme.colors.neutralStrong,
              borderRadius: 8,
              padding: 14,
            })}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={{ color: theme.colors.textInverse, fontSize: 16, fontWeight: "700" }}>Save to Local Database</Text>
              )}
            </Pressable>
          ) : null}

          <Pressable
            disabled={isRefreshingPrice || !item}
            onPress={() => void handleRefreshPricing()}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: isRefreshingPrice ? theme.colors.disabled : pressed ? theme.colors.neutralStrong : theme.colors.neutralStrong,
              borderRadius: 8,
              padding: 14,
            })}
          >
            {isRefreshingPrice ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={{ color: theme.colors.textInverse, fontSize: 16, fontWeight: "700" }}>
                {pricingProvider.mode === "convex_marketplace"
                  ? "Search Using This Title"
                  : "Re-run Local Pricing"}
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={isDeleting}
            onPress={handleDelete}
            style={({ pressed }) => ({
              alignItems: "center",
              borderColor: pressed ? theme.colors.dangerStrong : theme.colors.danger,
              borderRadius: 8,
              borderWidth: 1,
              padding: 14,
            })}
          >
            <Text style={{ color: theme.colors.danger, fontSize: 16, fontWeight: "700" }}>
              {isDeleting ? (detail?.isSaved ? "Deleting..." : "Discarding...") : detail?.isSaved ? "Delete Local Scan" : "Discard Result"}
            </Text>
          </Pressable>
        </>
      ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FlowCard(input: {
  scan: NonNullable<StoredScanDetail["scan"]>;
  hasIdentity: boolean;
  estimate: PriceEstimate | null | undefined;
}) {
  const theme = useTheme();
  const evidence = parsePricingEvidence(input.estimate);
  const providerMixLabel = formatProviderMixLabel(input.estimate, evidence);
  const steps = [
    { title: "Capture", state: "done" as const },
    { title: "Analyze", state: input.hasIdentity ? ("done" as const) : ("pending" as const) },
    { title: "Search", state: input.estimate ? ("done" as const) : ("pending" as const) },
  ];

  return (
    <View style={{ borderColor: theme.colors.neutralBorder, borderRadius: 8, borderWidth: 1, gap: 10, paddingHorizontal: 14, paddingVertical: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {steps.map((step, index) => (
          <FlowStep
            key={step.title}
            title={step.title}
            state={step.state}
            showConnector={index < steps.length - 1}
          />
        ))}
      </View>
      <Text selectable style={{ color: theme.colors.textSoft, fontSize: 12, lineHeight: 17 }}>
        {input.estimate
          ? `Marketplace results are in from ${providerMixLabel}.`
          : input.hasIdentity
            ? "Ready to search with the current item title."
            : "Waiting on a stronger item identity before search."}
      </Text>
    </View>
  );
}

function FlowStep(input: {
  title: string;
  state: "done" | "pending";
  showConnector: boolean;
}) {
  const theme = useTheme();
  const isDone = input.state === "done";

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ alignItems: "center", width: 24 }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: isDone ? theme.colors.primary : theme.colors.neutralSurfaceStrong,
              borderRadius: 999,
              height: 24,
              justifyContent: "center",
              width: 24,
            }}
          >
            <Text style={{ color: isDone ? theme.colors.textInverse : theme.colors.textSoft, fontSize: 11, fontWeight: "900" }}>
              {isDone ? "✓" : ""}
            </Text>
          </View>
        </View>

        {input.showConnector ? (
          <View
            style={{
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: isDone ? theme.colors.primarySoft : theme.colors.neutralSurfaceStrong,
                height: 2,
                width: "100%",
              }}
            />
          </View>
        ) : null}
      </View>

      <View
        style={{
          alignItems: "center",
          paddingTop: 8,
          width: 24,
        }}
      >
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            fontSize: 12,
            fontWeight: "700",
            textAlign: "center",
            width: 64,
          }}
        >
          {input.title}
        </Text>
      </View>
    </View>
  );
}

function PriceCard({ estimate }: { estimate: PriceEstimate | null | undefined }) {
  const theme = useTheme();
  if (!estimate) {
    return (
      <View style={{ borderColor: theme.colors.neutralBorder, borderRadius: 8, borderWidth: 1, gap: 6, padding: 14 }}>
        <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
          No price estimate yet
        </Text>
        <Text selectable style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
          Pricing will appear here after local cache or cloud enrichment runs.
        </Text>
      </View>
    );
  }

  const evidence = parsePricingEvidence(estimate);
  const providerMixLabel = formatProviderMixLabel(estimate, evidence);
  const providerCount = getStructuredProviderLabels(evidence).length;

  return (
    <View style={{ backgroundColor: theme.colors.neutralStrong, borderRadius: 8, gap: 12, padding: 16 }}>
      <Text selectable style={{ color: theme.colors.textInverse, fontSize: 18, fontWeight: "800" }}>
        Pricing Signal
      </Text>
      <Text selectable style={{ color: theme.colors.textInverse, fontSize: 34, fontWeight: "900" }}>
        {formatRange(estimate)}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pill label={providerMixLabel} />
        <Pill label={`List ${formatMoney(estimate.suggestedListPrice, estimate.currency)}`} />
        <Pill label={`Buy ${formatMoney(estimate.suggestedBuyPrice, estimate.currency)}`} />
        <Pill label={formatConfidence(estimate.confidence)} />
      </View>
      {providerCount > 1 ? (
        <Text selectable style={{ color: theme.colors.neutralBorderSoft, lineHeight: 19 }}>
          Combined from {providerCount} structured sources.
        </Text>
      ) : null}
      <Text selectable style={{ color: theme.colors.neutralBorder, lineHeight: 20 }}>
        {estimate.evidenceSummary ?? "No evidence summary."}
      </Text>
      {estimate.lookupQuery ? (
        <Text selectable style={{ color: theme.colors.disabled, lineHeight: 20 }}>
          Query: {estimate.lookupQuery}
        </Text>
      ) : null}
    </View>
  );
}

function EvidenceSection({ estimate }: { estimate: PriceEstimate | null | undefined }) {
  const theme = useTheme();
  const evidence = parsePricingEvidence(estimate);

  if (!estimate || evidence.sources.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: theme.colors.text, fontSize: 20, fontWeight: "800" }}>
          Comparable Listings
        </Text>
        {evidence.searchQueries.length > 0 ? (
          <Text selectable style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
            {evidence.searchQueries.length} marketplace search quer{evidence.searchQueries.length === 1 ? "y" : "ies"} checked.
          </Text>
        ) : null}
        <Text selectable style={{ color: theme.colors.textSoft, fontSize: 13, lineHeight: 18 }}>
          Tap any result to open the original listing.
        </Text>
      </View>

      {evidence.searchQueries.length > 0 ? (
        <View style={{ gap: 6 }}>
          {evidence.searchQueries.map((query) => (
            <Text key={query} selectable style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 }}>
              {query}
            </Text>
          ))}
        </View>
      ) : null}

      {evidence.providerAttempts.length > 0 ? (
        <View style={{ gap: 6 }}>
          {evidence.providerAttempts.map((attempt) => (
            <Text key={`${attempt.name}-${attempt.status}`} selectable style={{ color: theme.colors.textSoft, fontSize: 12, lineHeight: 17 }}>
              {formatProviderAttempt(attempt)}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        {evidence.sources.map((source, index) => (
          <EvidenceCard key={`${source.url ?? source.title}-${index}`} source={source} />
        ))}
      </View>
    </View>
  );
}

function EvidenceCard({ source }: { source: DetailEvidenceItem }) {
  const theme = useTheme();
  const price = source.detectedPrice !== undefined ? formatMoney(source.detectedPrice, source.currency ?? "USD") : "No price";
  const reasons = source.reasons?.length ? source.reasons.join(" / ") : source.marketplaceType ?? "web result";

  async function openSource() {
    if (!source.url) return;
    await Linking.openURL(source.url);
  }

  return (
    <Pressable
      disabled={!source.url}
      onPress={() => void openSource()}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.colors.background : theme.colors.surface,
        borderColor: theme.colors.neutralBorder,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        padding: 14,
      })}
    >
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text selectable style={{ color: theme.colors.textSoft, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>
            {source.domain ?? "Unknown source"}
          </Text>
          <Text selectable style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800", lineHeight: 21 }}>
            {source.title}
          </Text>
        </View>
        <Text selectable style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
          {price}
        </Text>
      </View>

      {source.snippet ? (
        <Text selectable style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
          {source.snippet}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <SmallPill label={source.marketplaceType ?? "web"} />
        <SmallPill label={`Score ${Math.round((source.relevanceScore ?? 0) * 100)}%`} />
        {source.exactModelMatch ? <SmallPill label="Model match" /> : null}
      </View>

      <Text selectable style={{ color: theme.colors.textSoft, fontSize: 12, lineHeight: 17 }}>
        {reasons}
      </Text>

      {source.url ? (
        <View
          style={{
            alignItems: "center",
            borderColor: theme.colors.neutralBorderSoft,
            borderRadius: 8,
            borderWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text selectable numberOfLines={1} style={{ color: theme.colors.link, flex: 1, fontSize: 13, fontWeight: "700" }}>
            View listing
          </Text>
          <Text selectable style={{ color: theme.colors.linkMuted, fontSize: 12, fontWeight: "700" }}>
            Open
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={{ gap: 2 }}>
      <Text selectable style={{ color: theme.colors.textSoft, fontSize: 13, fontWeight: "700" }}>
        {label}
      </Text>
      <Text selectable style={{ color: theme.colors.text, lineHeight: 20 }}>
        {value}
      </Text>
    </View>
  );
}

function Pill({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.badgeNeutral, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: theme.colors.textInverse, fontSize: 13, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function SmallPill({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.badgeInfo, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
      <Text style={{ color: theme.colors.badgeInfoText, fontSize: 12, fontWeight: "800" }}>{label}</Text>
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

function formatSourceLabel(sourceType: PriceEstimate["sourceType"]): string {
  switch (sourceType) {
    case "reverb_listing":
      return "Reverb";
    case "ebay_browse":
      return "eBay";
    case "pricecharting":
      return "PriceCharting";
    case "brave_discovery":
      return "Brave discovery";
    case "convex_cache":
      return "cached marketplace result";
    case "local_cache":
      return "local cache";
    case "manual":
      return "manual estimate";
    case "mock":
      return "mock estimate";
    default:
      return sourceType.replace(/_/g, " ");
  }
}

interface DetailEvidenceItem {
  title: string;
  url?: string;
  domain?: string;
  snippet?: string;
  detectedPrice?: number;
  currency?: string;
  sourceType?: string;
  relevanceScore?: number;
  exactModelMatch?: boolean;
  marketplaceType?: string;
  query?: string;
  rank?: number;
  reasons?: string[];
}

interface DetailEvidencePayload {
  searchQueries: string[];
  sources: DetailEvidenceItem[];
  providerAttempts: ProviderAttempt[];
}

interface ProviderAttempt {
  name: string;
  status: "success" | "skipped" | "error";
  message: string;
  sourceType?: PriceEstimate["sourceType"];
}

function parsePricingEvidence(estimate: PriceEstimate | null | undefined): DetailEvidencePayload {
  if (!estimate?.rawEvidenceJson) {
    return { searchQueries: [], sources: [], providerAttempts: [] };
  }

  try {
    const parsed = JSON.parse(estimate.rawEvidenceJson) as {
      estimateRawEvidenceJson?: string;
      evidence?: DetailEvidenceItem[];
      searchQueries?: string[];
      sources?: DetailEvidenceItem[];
      providerAttempts?: ProviderAttempt[];
    };
    const providerPayload = parsed.estimateRawEvidenceJson
      ? JSON.parse(parsed.estimateRawEvidenceJson) as {
          searchQueries?: string[];
          sources?: DetailEvidenceItem[];
          providerAttempts?: ProviderAttempt[];
        }
      : parsed;

    return {
      searchQueries: providerPayload.searchQueries ?? parsed.searchQueries ?? [],
      sources: providerPayload.sources ?? parsed.sources ?? parsed.evidence ?? [],
      providerAttempts: providerPayload.providerAttempts ?? parsed.providerAttempts ?? [],
    };
  } catch {
    return { searchQueries: [], sources: [], providerAttempts: [] };
  }
}

function formatProviderAttempt(attempt: ProviderAttempt): string {
  const label = attempt.sourceType ? `${attempt.name}: ${formatSourceLabel(attempt.sourceType)}` : attempt.name;
  return `${label} ${attempt.status} - ${attempt.message}`;
}

function getStructuredProviderLabels(payload: DetailEvidencePayload): string[] {
  const structuredSourceTypes = new Set<PriceEstimate["sourceType"]>();

  payload.sources.forEach((source) => {
    const sourceType = source.sourceType as PriceEstimate["sourceType"] | undefined;
    if (sourceType && isStructuredSourceType(sourceType)) {
      structuredSourceTypes.add(sourceType);
    }
  });

  payload.providerAttempts.forEach((attempt) => {
    if (attempt.status === "success" && attempt.sourceType && isStructuredSourceType(attempt.sourceType)) {
      structuredSourceTypes.add(attempt.sourceType);
    }
  });

  return Array.from(structuredSourceTypes).map((sourceType) => formatSourceLabel(sourceType));
}

function formatProviderMixLabel(
  estimate: PriceEstimate | null | undefined,
  payload: DetailEvidencePayload,
): string {
  if (!estimate) return "Marketplace";
  const providers = getStructuredProviderLabels(payload);
  if (providers.length === 0) return formatSourceLabel(estimate.sourceType);
  if (providers.length === 1) return providers[0] ?? formatSourceLabel(estimate.sourceType);
  if (providers.length === 2) return `${providers[0]} + ${providers[1]}`;
  return `${providers[0]} + ${providers.length - 1} more`;
}

function isStructuredSourceType(sourceType: PriceEstimate["sourceType"]): boolean {
  return sourceType === "reverb_listing" || sourceType === "ebay_browse" || sourceType === "pricecharting";
}
