import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { ProviderOutcome, ResolvedPricingResult, PricingIdentity } from "./providers/sharedPricing";
import { isMusicGearIdentity } from "./providers/sharedPricing";
import { lookupReverbPricing } from "./providers/reverbProvider";
import { lookupEbayPricing } from "./providers/ebayProvider";
import { lookupPriceChartingPricing } from "./providers/priceChartingProvider";
import { lookupBraveDiscovery } from "./providers/braveProvider";

const DEFAULT_CURRENCY = "USD";
const PRICE_TTL_DAYS = 30;
const STRONG_SOURCE_TYPES: ResolvedPricingResult["sourceType"][] = ["reverb_listing", "ebay_browse", "pricecharting"];

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
    condition: v.optional(v.string()),
    cacheHit: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<PricingActionResponse> => {
    const lookupCacheKey = buildCacheKey(args.identity);
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

    const cached = await ctx.runQuery(api.priceSnapshots.getFreshSnapshot, {
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

    const providers: Array<{
      name: string;
      run: () => Promise<ProviderOutcome>;
    }> = buildProviders(args.identity, args.query, args.condition);

    const attempts: ProviderAttemptTrace[] = [];
    let structuredWinner: ResolvedPricingResult | null = null;
    let structuredSourceLabel: PricingSourceTypeString | null = null;
    let discoveryWinner: ResolvedPricingResult | null = null;

    for (const provider of providers) {
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

      if (STRONG_SOURCE_TYPES.includes(result.sourceType) && !structuredWinner) {
        structuredWinner = result;
        structuredSourceLabel = sourceLabel;
        break;
      }

      if (!discoveryWinner && result.sourceType === "brave_discovery") {
        discoveryWinner = result;
      }
    }

    const winner = structuredWinner ?? discoveryWinner;
    const winnerLabel = structuredSourceLabel ?? (discoveryWinner ? "brave_discovery" : null);

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

    await ctx.runMutation(api.priceSnapshots.recordSnapshot, {
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

function buildCacheKey(identity: PricingIdentity): string {
  return [
    identity.normalizedBrand ?? "",
    identity.normalizedModel ?? "",
    identity.category ? identity.category.toLowerCase().trim() : "",
    identity.normalizedName,
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

function buildProviders(identity: PricingIdentity, query: string, condition?: string) {
  const generalProviders: Array<{
    name: string;
    run: () => Promise<ProviderOutcome>;
  }> = [
    { name: "ebay", run: () => lookupEbayPricing({ identity, query, condition }) },
    { name: "pricecharting", run: () => lookupPriceChartingPricing({ identity, query }) },
    { name: "brave", run: () => lookupBraveDiscovery({ identity, query }) },
  ];

  if (!isMusicGearIdentity(identity, query)) {
    return generalProviders;
  }

  return [
    { name: "reverb", run: () => lookupReverbPricing({ identity, query }) },
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
