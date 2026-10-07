import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { ConditionGrade, EvidenceItem, ProviderOutcome, ResolvedPricingResult, PricingIdentity } from "./providers/sharedPricing";
import { estimateConfidence, isMusicGearIdentity, summarizePrices, trimPriceOutliers } from "./providers/sharedPricing";
import { lookupReverbPricing } from "./providers/reverbProvider";
import { lookupEbayPricing } from "./providers/ebayProvider";
import { lookupPriceChartingPricing } from "./providers/priceChartingProvider";
import { lookupBraveDiscovery } from "./providers/braveProvider";

const DEFAULT_CURRENCY = "USD";
const PRICE_TTL_DAYS = 30;
const STRONG_SOURCE_TYPES: ResolvedPricingResult["sourceType"][] = ["reverb_listing", "ebay_browse", "pricecharting"];
const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export type PricingSourceTypeString =
  | "convex_cache"
  | "reverb_listing"
  | "ebay_browse"
  | "pricecharting"
  | "brave_discovery";

export interface ProviderAttemptTrace {
  name: string;
  status: "success" | "skipped" | "error";
  message: string;
  sourceType?: PricingSourceTypeString;
}

export const lookupPricing = action({
  args: {
    identity: v.object({
      displayName: v.string(),
      normalizedName: v.string(),
      brand: v.optional(v.string()),
      normalizedBrand: v.optional(v.string()),
      model: v.optional(v.string()),
      normalizedModel: v.optional(v.string()),
      category: v.optional(v.string()),
      variant: v.optional(v.string()),
    }),
    query: v.string(),
    condition: v.optional(v.union(v.literal("new"), v.literal("used"), v.literal("for_parts"))),
    deviceId: v.string(),
    forceRefresh: v.optional(v.boolean()),
    cacheHit: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<PricingActionResponse> => {
    const lookupCacheKey = buildCacheKey(args.identity, args.condition);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + PRICE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    if (args.cacheHit) {
      return {
        ok: false,
        reason: "cache_hit_short_circuit",
        message: "Pricing was already satisfied by cache; no paid lookup was run.",
        lookupCacheKey,
        creditCost: 0,
        createdAt,
      };
    }

    if (!DEVICE_ID_PATTERN.test(args.deviceId)) {
      return {
        ok: false,
        reason: "invalid_device",
        message: "Pricing requests need a valid app install id.",
        lookupCacheKey,
        creditCost: 0,
        createdAt,
      };
    }

    const cached = args.forceRefresh
      ? null
      : await ctx.runQuery(internal.priceSnapshots.getFreshSnapshot, {
          lookupCacheKey,
          nowIso: createdAt,
        });
    if (cached) {
      return {
        ok: true,
        result: {
          currency: cached.currency,
          confidence: cached.confidence,
          sourceType: "convex_cache",
          evidenceSummary: cached.evidenceSummary,
          sources: parseEvidenceJson(cached.evidenceJson),
          searchQueries: [],
          providerAttempts: [],
          lookupCacheKey: cached.lookupCacheKey,
          creditCost: 0,
          createdAt: cached.createdAt,
          ...(cached.lowPrice !== undefined ? { lowPrice: cached.lowPrice } : {}),
          ...(cached.highPrice !== undefined ? { highPrice: cached.highPrice } : {}),
          ...(cached.medianPrice !== undefined ? { medianPrice: cached.medianPrice } : {}),
          ...(cached.suggestedListPrice !== undefined ? { suggestedListPrice: cached.suggestedListPrice } : {}),
          ...(cached.suggestedBuyPrice !== undefined ? { suggestedBuyPrice: cached.suggestedBuyPrice } : {}),
          ...(cached.retailPrice !== undefined ? { retailPrice: cached.retailPrice } : {}),
        },
      };
    }

    const quota = await ctx.runMutation(internal.rateLimits.consumeLookupQuota, { deviceId: args.deviceId });
    if (!quota.allowed) {
      const retryMinutes = Math.max(1, Math.ceil(quota.retryAfterMs / 60000));
      return {
        ok: false,
        reason: "rate_limited",
        message: quota.scope === "global"
          ? `Fresh pricing lookups are paused for today. Cached prices still work. Try again in about ${retryMinutes} min.`
          : `You've hit the fresh-lookup limit for now. Try again in about ${retryMinutes} min.`,
        lookupCacheKey,
        creditCost: 0,
        createdAt,
      };
    }

    const providers: Array<{
      name: string;
      run: () => Promise<ProviderOutcome>;
    }> = buildProviders(args.identity, args.query, args.condition);

    const disabledProviders = readDisabledProviders();
    const attempts: ProviderAttemptTrace[] = [];
    const structuredResults: ResolvedPricingResult[] = [];
    const discoveryResults: ResolvedPricingResult[] = [];

    for (const provider of providers) {
      if (disabledProviders.has(provider.name)) {
        attempts.push({
          name: provider.name,
          status: "skipped",
          message: "Disabled by PRICING_DISABLED_PROVIDERS.",
        });
        continue;
      }

      const outcome = await provider.run();
      if (!outcome.ok) {
        attempts.push({
          name: provider.name,
          status: outcome.skip ? "skipped" : "error",
          message: outcome.message ?? outcome.reason ?? "unknown",
        });
        continue;
      }

      const result = outcome.result;
      if (!result) continue;

      const sourceLabel = mapSourceTypeLabel(result.sourceType);
      attempts.push({
        name: provider.name,
        status: "success",
        message: `Returned ${sourceLabel}.`,
        sourceType: sourceLabel,
      });

      if (STRONG_SOURCE_TYPES.includes(result.sourceType)) {
        structuredResults.push(result);
        continue;
      }

      if (result.sourceType === "brave_discovery") {
        discoveryResults.push(result);
      }
    }

    const winner = structuredResults.length > 0
      ? combineStructuredResults(structuredResults, discoveryResults, lookupCacheKey)
      : discoveryResults[0] ?? null;
    const winnerLabel = winner ? mapSourceTypeLabel(winner.sourceType) : null;

    if (!winner || !winnerLabel) {
      return {
        ok: false,
        reason: "all_providers_failed",
        message: `All configured pricing providers failed to return structured prices. Attempts: ${attempts
          .map((a) => `${a.name}=${a.status}:${a.message}`)
          .join("; ")}`,
        lookupCacheKey,
        creditCost: 0,
        createdAt,
      };
    }

    await ctx.runMutation(internal.priceSnapshots.recordSnapshot, {
      lookupCacheKey,
      normalizedName: args.identity.normalizedName,
      brand: args.identity.brand,
      model: args.identity.model,
      category: args.identity.category,
      currency: winner.currency,
      confidence: winner.confidence,
      sourceType: winnerLabel,
      evidenceSummary: winner.evidenceSummary,
      evidenceJson: JSON.stringify(winner.sources),
      createdAt: winner.createdAt,
      expiresAt,
      ...(winner.lowPrice !== undefined ? { lowPrice: winner.lowPrice } : {}),
      ...(winner.highPrice !== undefined ? { highPrice: winner.highPrice } : {}),
      ...(winner.medianPrice !== undefined ? { medianPrice: winner.medianPrice } : {}),
      ...(winner.suggestedListPrice !== undefined ? { suggestedListPrice: winner.suggestedListPrice } : {}),
      ...(winner.suggestedBuyPrice !== undefined ? { suggestedBuyPrice: winner.suggestedBuyPrice } : {}),
      ...(winner.retailPrice !== undefined ? { retailPrice: winner.retailPrice } : {}),
    });

    return {
      ok: true,
      result: {
        currency: winner.currency,
        confidence: winner.confidence,
        sourceType: winnerLabel,
        evidenceSummary: winner.evidenceSummary,
        sources: winner.sources,
        searchQueries: winner.searchQueries,
        providerAttempts: attempts,
        lookupCacheKey,
        creditCost: winner.creditCost,
        createdAt: winner.createdAt,
        ...(winner.lowPrice !== undefined ? { lowPrice: winner.lowPrice } : {}),
        ...(winner.highPrice !== undefined ? { highPrice: winner.highPrice } : {}),
        ...(winner.medianPrice !== undefined ? { medianPrice: winner.medianPrice } : {}),
        ...(winner.suggestedListPrice !== undefined ? { suggestedListPrice: winner.suggestedListPrice } : {}),
        ...(winner.suggestedBuyPrice !== undefined ? { suggestedBuyPrice: winner.suggestedBuyPrice } : {}),
        ...(winner.retailPrice !== undefined ? { retailPrice: winner.retailPrice } : {}),
      },
    };
  },
});

export interface PricingActionSuccess {
  ok: true;
  result: {
    currency: string;
    confidence: number;
    sourceType: PricingSourceTypeString;
    evidenceSummary: string;
    sources: unknown[];
    searchQueries: string[];
    providerAttempts: ProviderAttemptTrace[];
    lookupCacheKey: string;
    creditCost: number;
    createdAt: string;
    lowPrice?: number;
    highPrice?: number;
    medianPrice?: number;
    suggestedListPrice?: number;
    suggestedBuyPrice?: number;
    retailPrice?: number;
  };
}

export interface PricingActionFailure {
  ok: false;
  reason: string;
  message: string;
  lookupCacheKey: string;
  creditCost: number;
  createdAt: string;
}

export type PricingActionResponse = PricingActionSuccess | PricingActionFailure;

function buildCacheKey(identity: PricingIdentity, condition?: ConditionGrade): string {
  return [
    identity.normalizedBrand ?? "",
    identity.normalizedModel ?? "",
    identity.category ? identity.category.toLowerCase().trim() : "",
    identity.normalizedName,
    condition ?? "",
  ].join("|");
}

function mapSourceTypeLabel(source: ResolvedPricingResult["sourceType"]): PricingSourceTypeString {
  switch (source) {
    case "reverb_listing":
      return "reverb_listing";
    case "ebay_browse":
      return "ebay_browse";
    case "pricecharting":
      return "pricecharting";
    case "brave_discovery":
      return "brave_discovery";
  }
}

// Comma-separated provider names to switch off without a deploy, e.g.
// `npx convex env set PRICING_DISABLED_PROVIDERS ebay`.
function readDisabledProviders(): Set<string> {
  return new Set(
    (process.env.PRICING_DISABLED_PROVIDERS ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );
}

function buildProviders(identity: PricingIdentity, query: string, condition?: ConditionGrade) {
  const generalProviders: Array<{
    name: string;
    run: () => Promise<ProviderOutcome>;
  }> = [
    { name: "ebay", run: () => lookupEbayPricing({ identity, query, condition }) },
    { name: "pricecharting", run: () => lookupPriceChartingPricing({ identity, query, condition }) },
    { name: "brave", run: () => lookupBraveDiscovery({ identity, query }) },
  ];

  if (!isMusicGearIdentity(identity, query)) {
    return generalProviders;
  }

  return [
    { name: "reverb", run: () => lookupReverbPricing({ identity, query, condition }) },
    ...generalProviders,
  ];
}

function parseEvidenceJson(json: string): unknown[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function combineStructuredResults(
  structuredResults: ResolvedPricingResult[],
  discoveryResults: ResolvedPricingResult[],
  lookupCacheKey: string,
): ResolvedPricingResult {
  const primary = structuredResults[0];
  const structuredSources = structuredResults.flatMap((result) => result.sources);
  const discoverySources = discoveryResults.flatMap((result) => result.sources);
  const allSources = dedupeEvidenceSources([...structuredSources, ...discoverySources]).slice(0, 16);
  const allQueries = Array.from(
    new Set([...structuredResults.flatMap((result) => result.searchQueries), ...discoveryResults.flatMap((result) => result.searchQueries)]),
  );
  const structuredPrices = trimPriceOutliers(
    structuredSources
      .map((source) => source.detectedPrice)
      .filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0),
  );
  const exactMatches = structuredSources.filter((source) => source.exactModelMatch).length;
  const providerLabels = Array.from(new Set(structuredResults.map((result) => mapSourceTypeLabel(result.sourceType))));
  const range = summarizePrices(structuredPrices);
  const retailCandidates = structuredResults
    .map((result) => result.retailPrice)
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0);
  const retailPrice = retailCandidates.length > 0 ? Math.round(retailCandidates.reduce((sum, price) => sum + price, 0) / retailCandidates.length) : undefined;
  const confidence = Math.max(
    primary.confidence,
    estimateConfidence({
      prices: structuredPrices,
      sources: structuredSources,
      exactMatchCount: exactMatches,
    }),
  );

  return {
    currency: primary.currency,
    confidence: Math.min(0.94, confidence + Math.min(0.1, (providerLabels.length - 1) * 0.05)),
    sourceType: primary.sourceType,
    evidenceSummary: buildAggregateSummary({
      providerLabels,
      structuredPricesCount: structuredPrices.length,
      sourceCount: structuredSources.length,
      exactMatchCount: exactMatches,
      discoveryCount: discoverySources.length,
    }),
    sources: allSources,
    searchQueries: allQueries,
    lookupCacheKey,
    creditCost: structuredResults.reduce((sum, result) => sum + result.creditCost, 0) + discoveryResults.reduce((sum, result) => sum + result.creditCost, 0),
    createdAt: new Date().toISOString(),
    ...(range.lowPrice !== undefined ? { lowPrice: range.lowPrice, suggestedBuyPrice: range.lowPrice } : {}),
    ...(range.highPrice !== undefined ? { highPrice: range.highPrice, suggestedListPrice: range.highPrice } : {}),
    ...(range.medianPrice !== undefined ? { medianPrice: range.medianPrice } : {}),
    ...(retailPrice !== undefined ? { retailPrice } : {}),
  };
}

function dedupeEvidenceSources(sources: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  const ranked = [...sources].sort((left, right) => (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0));
  return ranked.filter((source) => {
    const key = `${source.url ?? ""}|${source.title.toLowerCase()}|${source.sourceType}|${source.detectedPrice ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildAggregateSummary(input: {
  providerLabels: PricingSourceTypeString[];
  structuredPricesCount: number;
  sourceCount: number;
  exactMatchCount: number;
  discoveryCount: number;
}): string {
  const providerText = input.providerLabels.length === 1
    ? mapSourceTypeLabelToName(input.providerLabels[0])
    : input.providerLabels.map(mapSourceTypeLabelToName).join(", ");
  const discoveryText = input.discoveryCount > 0 ? ` Added ${input.discoveryCount} discovery lead${input.discoveryCount === 1 ? "" : "s"}.` : "";
  return `Combined ${input.structuredPricesCount} price signal(s) from ${input.sourceCount} listing${input.sourceCount === 1 ? "" : "s"} across ${providerText}. ${input.exactMatchCount} exact model match${input.exactMatchCount === 1 ? "" : "es"} found.${discoveryText}`;
}

function mapSourceTypeLabelToName(sourceType: PricingSourceTypeString): string {
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
      return "cache";
  }
}
