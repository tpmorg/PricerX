import type { InventoryItem, ObjectIdentity, PriceEstimate, PricingResult } from "@pricernu/shared";
import { buildCacheKey, buildObjectIdentity, buildPricingQuery, mockPricingProvider } from "@pricernu/shared";
import { convexMarketplacePricingProvider, getConvexUrl } from "@/features/pricing/convexPricingProvider";
import { initializeLocalRepositories, localRepositories } from "@/storage/localRepositories";

const PRICE_TTL_DAYS = 30;

export interface LocalPricingLookupInput {
  inventoryItem: InventoryItem;
  identity?: ObjectIdentity;
  query?: string;
  forceRefresh?: boolean;
  allowMockFallback?: boolean;
  persistResult?: boolean;
}

export interface LocalPricingLookupResult {
  estimate: PriceEstimate;
  cacheHit: boolean;
}

export interface PricingProviderStatus {
  mode: "convex_marketplace" | "mock";
  convexUrlConfigured: boolean;
}

export async function lookupPriceForInventoryItem(
  input: LocalPricingLookupInput,
): Promise<LocalPricingLookupResult> {
  await initializeLocalRepositories();

  const now = new Date();
  const nowIso = now.toISOString();
  const persistResult = input.persistResult !== false;
  const identity = input.identity ?? buildIdentityFromInventoryItem(input.inventoryItem);
  const query = input.query?.trim() || buildPricingQuery(identity);
  const lookupCacheKey = buildCacheKey(identity);

  if (!input.forceRefresh) {
    const cached = await localRepositories.priceEstimates.findFreshByCacheKey(lookupCacheKey, nowIso);
    if (cached && canUseCachedEstimate(cached, input.allowMockFallback === true)) {
      const estimate = cloneCachedEstimateForItem({
        cached,
        inventoryItemId: input.inventoryItem.id,
        now,
      });
      if (persistResult) {
        await localRepositories.priceEstimates.create(estimate);
      }
      logLocalPricingDebug("cache_hit", {
        lookupCacheKey,
        query,
        sourceType: estimate.sourceType,
      });
      return { estimate, cacheHit: true };
    }
  }

  const provider = getPricingProvider({ allowMockFallback: input.allowMockFallback === true });
  const providerResult = await provider.lookup(
    { identity, query, condition: input.inventoryItem.condition },
    { requestId: createLocalId("pricing-request"), now },
  );
  const estimate = estimateFromProviderResult({
    providerResult,
    inventoryItemId: input.inventoryItem.id,
    lookupCacheKey,
    now,
  });

  if (persistResult) {
    await localRepositories.priceEstimates.create(estimate);
  }
  logLocalPricingDebug("provider_result", {
    lookupCacheKey,
    query,
    sourceType: estimate.sourceType,
  });
  return { estimate, cacheHit: false };
}

export function getPricingProviderStatus(): PricingProviderStatus {
  const convexUrlConfigured = Boolean(getConvexUrl());
  return {
    mode: convexUrlConfigured ? "convex_marketplace" : "mock",
    convexUrlConfigured,
  };
}

function buildIdentityFromInventoryItem(item: InventoryItem): ObjectIdentity {
  return buildObjectIdentity({
    objectName: item.displayName,
    brand: item.brand,
    model: item.model,
    category: item.category,
    variant: item.variant,
  });
}

function getPricingProvider(input: { allowMockFallback: boolean }) {
  if (getConvexUrl()) return convexMarketplacePricingProvider;
  if (input.allowMockFallback) return mockPricingProvider;

  throw new Error(
    "Marketplace pricing is not configured. Set EXPO_PUBLIC_CONVEX_URL in the mobile environment and configure at least one backend provider, then reload the app.",
  );
}

function canUseCachedEstimate(estimate: PriceEstimate, allowMockFallback: boolean): boolean {
  if (allowMockFallback) return true;
  if (estimate.sourceType === "mock" || estimate.sourceType === "manual") return false;

  if (estimate.sourceType === "local_cache" && estimate.rawEvidenceJson) {
    try {
      const raw = JSON.parse(estimate.rawEvidenceJson) as { cachedSourceType?: string };
      return raw.cachedSourceType !== "mock" && raw.cachedSourceType !== "manual";
    } catch {
      return false;
    }
  }

  return true;
}

function estimateFromProviderResult(input: {
  providerResult: PricingResult;
  inventoryItemId: string;
  lookupCacheKey: string;
  now: Date;
}): PriceEstimate {
  const { estimate } = input.providerResult;
  const createdAt = input.now.toISOString();

  return {
    id: createLocalId("price"),
    inventoryItemId: input.inventoryItemId,
    sourceType: estimate.sourceType,
    currency: estimate.currency,
    creditCost: estimate.creditCost,
    createdAt,
    expiresAt: addDays(input.now, PRICE_TTL_DAYS).toISOString(),
    lookupCacheKey: input.lookupCacheKey,
    ...(estimate.lookupQuery ? { lookupQuery: estimate.lookupQuery } : {}),
    ...(estimate.lowPrice !== undefined ? { lowPrice: estimate.lowPrice } : {}),
    ...(estimate.highPrice !== undefined ? { highPrice: estimate.highPrice } : {}),
    ...(estimate.medianPrice !== undefined ? { medianPrice: estimate.medianPrice } : {}),
    ...(estimate.suggestedListPrice !== undefined ? { suggestedListPrice: estimate.suggestedListPrice } : {}),
    ...(estimate.suggestedBuyPrice !== undefined ? { suggestedBuyPrice: estimate.suggestedBuyPrice } : {}),
    ...(estimate.retailPrice !== undefined ? { retailPrice: estimate.retailPrice } : {}),
    ...(estimate.confidence !== undefined ? { confidence: estimate.confidence } : {}),
    ...(estimate.evidenceSummary ? { evidenceSummary: estimate.evidenceSummary } : {}),
    rawEvidenceJson: JSON.stringify({
      estimateRawEvidenceJson: estimate.rawEvidenceJson,
      evidence: input.providerResult.evidence,
    }),
  };
}

function cloneCachedEstimateForItem(input: {
  cached: PriceEstimate;
  inventoryItemId: string;
  now: Date;
}): PriceEstimate {
  return {
    id: createLocalId("price"),
    inventoryItemId: input.inventoryItemId,
    sourceType: "local_cache",
    currency: input.cached.currency,
    creditCost: 0,
    createdAt: input.now.toISOString(),
    ...(input.cached.lookupQuery ? { lookupQuery: input.cached.lookupQuery } : {}),
    ...(input.cached.lowPrice !== undefined ? { lowPrice: input.cached.lowPrice } : {}),
    ...(input.cached.highPrice !== undefined ? { highPrice: input.cached.highPrice } : {}),
    ...(input.cached.medianPrice !== undefined ? { medianPrice: input.cached.medianPrice } : {}),
    ...(input.cached.suggestedListPrice !== undefined ? { suggestedListPrice: input.cached.suggestedListPrice } : {}),
    ...(input.cached.suggestedBuyPrice !== undefined ? { suggestedBuyPrice: input.cached.suggestedBuyPrice } : {}),
    ...(input.cached.retailPrice !== undefined ? { retailPrice: input.cached.retailPrice } : {}),
    ...(input.cached.confidence !== undefined ? { confidence: input.cached.confidence } : {}),
    ...(input.cached.evidenceSummary ? { evidenceSummary: input.cached.evidenceSummary } : {}),
    ...(input.cached.lookupCacheKey ? { lookupCacheKey: input.cached.lookupCacheKey } : {}),
    ...(input.cached.expiresAt ? { expiresAt: input.cached.expiresAt } : {}),
    rawEvidenceJson: JSON.stringify({
      cachedFromEstimateId: input.cached.id,
      cachedSourceType: input.cached.sourceType,
    }),
  };
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function logLocalPricingDebug(
  event: "cache_hit" | "provider_result",
  details: {
    lookupCacheKey: string;
    query: string;
    sourceType: PriceEstimate["sourceType"];
  },
) {
  if (typeof __DEV__ !== "undefined" && !__DEV__) return;

  console.info("[pricing] Local pricing flow", {
    event,
    query: details.query,
    lookupCacheKey: details.lookupCacheKey,
    sourceType: details.sourceType,
  });
}
