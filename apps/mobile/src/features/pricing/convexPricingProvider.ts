import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import type { PricingEvidenceItem, PricingProvider, PricingResult } from "@pricernu/shared";

const LOOKUP_PRICING_ACTION = "pricing:lookupPricing" as unknown as FunctionReference<"action">;

interface ConvexPricingSuccess {
  ok: true;
  result: {
    currency: string;
    confidence: number;
    sourceType: "brave_search";
    evidenceSummary: string;
    sources: PricingEvidenceItem[];
    lookupCacheKey: string;
    creditCost: number;
    createdAt: string;
    lowPrice?: number;
    highPrice?: number;
    medianPrice?: number;
    suggestedListPrice?: number;
    suggestedBuyPrice?: number;
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

export const convexBravePricingProvider: PricingProvider = {
  id: "convex-brave-pricing",
  label: "Convex Brave Pricing",
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
      throw new Error(response.message);
    }

    const result = response.result;
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
