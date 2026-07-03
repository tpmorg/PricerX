import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import type { PricingEvidenceItem, PricingProvider, PricingResult } from "@pricernu/shared";

const LOOKUP_PRICING_ACTION = "pricing:lookupPricing" as unknown as FunctionReference<"action">;

interface ConvexPricingSuccess {
  ok: true;
  result: {
    currency: string;
    confidence: number;
    sourceType:
      | "convex_cache"
      | "reverb_listing"
      | "ebay_browse"
      | "pricecharting"
      | "brave_discovery";
    evidenceSummary: string;
    sources: PricingEvidenceItem[];
    searchQueries: string[];
    providerAttempts: Array<{
      name: string;
      status: "success" | "skipped" | "error";
      message: string;
      sourceType?: "convex_cache" | "reverb_listing" | "ebay_browse" | "pricecharting" | "brave_discovery";
    }>;
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

interface ConvexPricingFailure {
  ok: false;
  reason: string;
  message: string;
  lookupCacheKey: string;
  creditCost: number;
  createdAt: string;
}

type ConvexPricingResponse = ConvexPricingSuccess | ConvexPricingFailure;

export const convexMarketplacePricingProvider: PricingProvider = {
  id: "convex-marketplace-pricing",
  label: "Convex Marketplace Pricing",
  async lookup(input) {
    const convexUrl = getConvexUrl();
    if (!convexUrl) {
      throw new Error("EXPO_PUBLIC_CONVEX_URL is not configured in the mobile app environment.");
    }

    const client = new ConvexHttpClient(convexUrl);
    const response = (await client.action(LOOKUP_PRICING_ACTION, {
      identity: input.identity,
      query: input.query,
      ...(input.condition ? { condition: input.condition } : {}),
    })) as ConvexPricingResponse;

    if (!response.ok) {
      logPricingFailure(input.query, response);
      throw new Error(response.message);
    }

    const result = response.result;
    logPricingSuccess(input.query, result);
    return {
      estimate: {
        sourceType: result.sourceType,
        lookupQuery: input.query,
        currency: result.currency,
        creditCost: result.creditCost,
        confidence: result.confidence,
        evidenceSummary: result.evidenceSummary,
        rawEvidenceJson: JSON.stringify({
          lookupCacheKey: result.lookupCacheKey,
          createdAt: result.createdAt,
          searchQueries: result.searchQueries,
          providerAttempts: result.providerAttempts,
          sources: result.sources,
        }),
        ...(result.lowPrice !== undefined ? { lowPrice: result.lowPrice } : {}),
        ...(result.highPrice !== undefined ? { highPrice: result.highPrice } : {}),
        ...(result.medianPrice !== undefined ? { medianPrice: result.medianPrice } : {}),
        ...(result.suggestedListPrice !== undefined ? { suggestedListPrice: result.suggestedListPrice } : {}),
        ...(result.suggestedBuyPrice !== undefined ? { suggestedBuyPrice: result.suggestedBuyPrice } : {}),
      },
      evidence: result.sources,
    } satisfies PricingResult;
  },
};

export function getConvexUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_CONVEX_URL?.trim();
  return value ? value : null;
}

function logPricingSuccess(query: string, result: ConvexPricingSuccess["result"]) {
  if (typeof __DEV__ !== "undefined" && !__DEV__) return;

  console.info("[pricing] Marketplace lookup success", {
    query,
    sourceType: result.sourceType,
    confidence: result.confidence,
    lookupCacheKey: result.lookupCacheKey,
    searchQueries: result.searchQueries,
    providerAttempts: result.providerAttempts,
    prices: {
      lowPrice: result.lowPrice,
      medianPrice: result.medianPrice,
      highPrice: result.highPrice,
      suggestedListPrice: result.suggestedListPrice,
      suggestedBuyPrice: result.suggestedBuyPrice,
      retailPrice: result.retailPrice,
    },
    topSources: result.sources.slice(0, 5),
  });
}

function logPricingFailure(query: string, response: ConvexPricingFailure) {
  if (typeof __DEV__ !== "undefined" && !__DEV__) return;

  console.warn("[pricing] Marketplace lookup failed", {
    query,
    reason: response.reason,
    message: response.message,
    lookupCacheKey: response.lookupCacheKey,
    creditCost: response.creditCost,
    createdAt: response.createdAt,
  });
}
