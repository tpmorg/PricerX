import type { ConditionGrade, PriceEstimate } from "@pricernu/shared";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { ConditionPicker } from "@/features/scans/components/ConditionPicker";
import { IdentityPicker } from "@/features/scans/components/IdentityPicker";
import {
  deleteScan,
  getStoredScanDetail,
  peekStagedScan,
  refreshStoredScanPricing,
  reviseScanIdentity,
  saveStoredScan,
  setScanCondition,
  subscribeToStagedScan,
  type IdentityRevision,
  type ScanProgress,
  type StageStatus,
  type StoredScanDetail,
} from "@/features/scans/localScanService";

export default function ScanDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<StoredScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScan = useCallback(async () => {
    if (!id) return;
    setError(null);

    const staged = peekStagedScan(id);
    if (staged) {
      setDetail(staged);
      setIsLoading(false);
      return;
    }

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

  // Staged scans fill in recognition and pricing in the background.
  useEffect(() => {
    if (!id) return;
    return subscribeToStagedScan(id, setDetail);
  }, [id]);

  // Saved scans re-price in the foreground; staged scans return immediately.
  async function runUpdate(operation: () => Promise<StoredScanDetail | null>, fallbackMessage: string) {
    setIsUpdating(true);
    setError(null);

    try {
      const nextDetail = await operation();
      // Staged updates already arrived through the subscription.
      if (nextDetail?.isSaved) setDetail(nextDetail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallbackMessage);
    } finally {
      setIsUpdating(false);
    }
  }

  function handleRevise(revision: IdentityRevision) {
    if (!id) return;
    void runUpdate(() => reviseScanIdentity(id, revision), "Could not update the item.");
  }

  function handleConditionChange(conditionGrade: ConditionGrade | null) {
    if (!id) return;
    void runUpdate(() => setScanCondition(id, conditionGrade), "Could not update condition.");
  }

  function handleRefreshPricing() {
    if (!id) return;
    void runUpdate(() => refreshStoredScanPricing(id), "Could not refresh pricing.");
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

  async function handleSave() {
    if (!id) return;
    setIsSaving(true);
    setError(null);

    try {
      const nextDetail = await saveStoredScan(id);
      setDetail(nextDetail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save scan.");
    } finally {
      setIsSaving(false);
    }
  }

  const scan = detail?.scan;
  const item = detail?.inventoryItem ?? null;
  const estimate = detail?.latestPriceEstimate;
  const progress = detail?.progress;
  const isRecognizing = progress?.recognition === "running";
  const isPricing = progress?.pricing === "running";
  const isBusy = isUpdating || isSaving || isDeleting;
  const canSave = Boolean(item) && !isRecognizing && !isBusy;

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

      {scan && progress ? (
        <>
          <View style={{ gap: 8 }}>
            <Text selectable style={{ fontSize: 28, fontWeight: "800" }}>
              {item?.displayName ?? (isRecognizing ? "Identifying…" : "Unidentified item")}
            </Text>
            <Text selectable style={{ color: theme.colors.textMuted, fontSize: 16, lineHeight: 22 }}>
              {formatHeadline(estimate, progress)}
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

          <FlowCard progress={progress} estimate={estimate} />

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

          <IdentityPicker
            candidates={detail.candidates}
            item={item}
            recognitionStatus={progress.recognition}
            disabled={isBusy}
            onPick={(candidate) =>
              handleRevise({
                displayName: candidate.displayName,
                ...(candidate.brand ? { brand: candidate.brand } : {}),
                ...(candidate.model ? { model: candidate.model } : {}),
                ...(candidate.category ? { category: candidate.category } : {}),
              })
            }
            onSubmit={handleRevise}
            {...(progress.recognitionError ? { recognitionError: progress.recognitionError } : {})}
          />

          {item ? (
            <ConditionPicker value={item.conditionGrade} disabled={isBusy} onChange={handleConditionChange} />
          ) : null}

          {progress.recognition === "done" && scan.recognitionConfidence !== undefined ? (
            <View style={{ backgroundColor: theme.colors.neutralSurface, borderColor: theme.colors.neutralBorder, borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
              <Field label="Confidence" value={`${Math.round(scan.recognitionConfidence * 100)}%`} />
            </View>
          ) : null}

          {item ? (
            <PriceCard
              estimate={estimate}
              status={isUpdating && detail.isSaved ? "running" : progress.pricing}
              onRetry={handleRefreshPricing}
              {...(progress.pricingError ? { errorMessage: progress.pricingError } : {})}
            />
          ) : null}
          <EvidenceSection estimate={estimate} />

          {!detail.isSaved ? (
            <Pressable
              disabled={!canSave}
              onPress={() => void handleSave()}
              style={{
                alignItems: "center",
                backgroundColor: canSave ? theme.colors.neutralStrong : theme.colors.disabled,
                borderRadius: 8,
                padding: 14,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={{ color: theme.colors.textInverse, fontSize: 16, fontWeight: "700" }}>Save to Local Database</Text>
              )}
            </Pressable>
          ) : null}

          {item ? (
            <Pressable
              disabled={isBusy || isPricing}
              onPress={handleRefreshPricing}
              style={{
                alignItems: "center",
                borderColor: theme.colors.neutralStrong,
                borderRadius: 8,
                borderWidth: 1,
                opacity: isBusy || isPricing ? 0.5 : 1,
                padding: 14,
              }}
            >
              <Text style={{ color: theme.colors.neutralStrong, fontSize: 16, fontWeight: "700" }}>Refresh Prices</Text>
            </Pressable>
          ) : null}

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
              {isDeleting ? (detail.isSaved ? "Deleting..." : "Discarding...") : detail.isSaved ? "Delete Local Scan" : "Discard Result"}
            </Text>
          </Pressable>
        </>
      ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatHeadline(estimate: PriceEstimate | null | undefined, progress: ScanProgress): string {
  if (progress.pricing === "running") return "Searching marketplaces…";
  if (estimate) return `${formatRange(estimate)} from ${formatSourceLabel(estimate.sourceType)}`;
  if (progress.recognition === "running") return "Reading the photo on-device…";
  if (progress.pricing === "failed") return "Pricing lookup failed.";
  return "Ready to search marketplace evidence.";
}

function FlowCard(input: {
  progress: ScanProgress;
  estimate: PriceEstimate | null | undefined;
}) {
  const theme = useTheme();
  const evidence = parsePricingEvidence(input.estimate);
  const providerMixLabel = formatProviderMixLabel(input.estimate, evidence);
  const steps: Array<{ title: string; state: StageStatus }> = [
    { title: "Capture", state: "done" },
    { title: "Identify", state: input.progress.recognition },
    { title: "Price", state: input.progress.pricing },
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
        {formatFlowCaption(input.progress, input.estimate ? providerMixLabel : null)}
      </Text>
    </View>
  );
}

function formatFlowCaption(progress: ScanProgress, providerMixLabel: string | null): string {
  if (progress.recognition === "running") return "Identifying the item. Prices load as soon as we know what it is.";
  if (progress.pricing === "running") return "Checking cached prices first, then marketplaces.";
  if (progress.pricing === "failed") return "Pricing failed. Adjust the item or condition, or retry.";
  if (providerMixLabel) return `Marketplace results are in from ${providerMixLabel}.`;
  if (progress.recognition === "failed") return "Tell us what the item is to search for prices.";
  return "Ready to search with the current item details.";
}

function FlowStep(input: {
  title: string;
  state: StageStatus;
  showConnector: boolean;
}) {
  const theme = useTheme();
  const isDone = input.state === "done";
  const isFailed = input.state === "failed";
  const isRunning = input.state === "running";

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ alignItems: "center", width: 24 }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: isDone ? theme.colors.primary : isFailed ? theme.colors.danger : theme.colors.neutralSurfaceStrong,
              borderRadius: 999,
              height: 24,
              justifyContent: "center",
              width: 24,
            }}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={{ color: isDone || isFailed ? theme.colors.textInverse : theme.colors.textSoft, fontSize: 11, fontWeight: "900" }}>
                {isDone ? "✓" : isFailed ? "!" : ""}
              </Text>
            )}
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

function PriceCard(input: {
  estimate: PriceEstimate | null | undefined;
  status: StageStatus;
  errorMessage?: string;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const { estimate } = input;

  if (input.status === "running") {
    return (
      <View style={{ alignItems: "center", backgroundColor: theme.colors.neutralStrong, borderRadius: 8, flexDirection: "row", gap: 12, padding: 16 }}>
        <ActivityIndicator color={theme.colors.textInverse} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text selectable style={{ color: theme.colors.textInverse, fontSize: 16, fontWeight: "800" }}>
            Searching marketplaces…
          </Text>
          <Text selectable style={{ color: theme.colors.neutralBorder, lineHeight: 19 }}>
            Cached prices come back instantly; fresh lookups take a few seconds.
          </Text>
        </View>
      </View>
    );
  }

  if (input.status === "failed") {
    return (
      <View style={{ borderColor: theme.colors.danger, borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
        <Text selectable style={{ color: theme.colors.danger, fontSize: 16, fontWeight: "800" }}>
          Couldn't get prices
        </Text>
        <Text selectable style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
          {input.errorMessage ?? "The pricing lookup failed."}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={input.onRetry}
          style={({ pressed }) => ({
            alignItems: "center",
            alignSelf: "flex-start",
            backgroundColor: pressed ? theme.colors.dangerStrong : theme.colors.danger,
            borderRadius: theme.radii.md,
            minHeight: 40,
            justifyContent: "center",
            paddingHorizontal: 16,
          })}
        >
          <Text style={{ color: theme.colors.textInverse, fontSize: 14, fontWeight: "800" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

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
