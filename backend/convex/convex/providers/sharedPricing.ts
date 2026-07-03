export interface PricingIdentity {
  displayName: string;
  normalizedName: string;
  brand?: string;
  normalizedBrand?: string;
  model?: string;
  normalizedModel?: string;
  category?: string;
  variant?: string;
}

export const DEFAULT_CURRENCY = "USD";
export const MAX_EVIDENCE_ITEMS = 12;
export const PRICE_TTL_DAYS = 30;
export const PRICE_CEILING = 100000;

export interface ResolvedPricingResult {
  currency: string;
  confidence: number;
  sourceType: "ebay_browse" | "pricecharting" | "brave_discovery";
  evidenceSummary: string;
  sources: EvidenceItem[];
  searchQueries: string[];
  lookupCacheKey: string;
  creditCost: number;
  createdAt: string;
  lowPrice?: number;
  highPrice?: number;
  medianPrice?: number;
  suggestedListPrice?: number;
  suggestedBuyPrice?: number;
  retailPrice?: number;
}

export interface EvidenceItem {
  title: string;
  url?: string;
  domain?: string;
  snippet?: string;
  detectedPrice?: number;
  priceText?: string;
  currency?: string;
  sourceType: string;
  relevanceScore: number;
  exactModelMatch: boolean;
  marketplaceType: string;
  query: string;
  rank: number;
  reasons: string[];
}

export type ProviderReason =
  | "missing_credentials"
  | "no_results"
  | "provider_error"
  | "network_error"
  | "rate_limited";

export interface ProviderOutcome {
  ok: boolean;
  skip?: boolean;
  reason?: ProviderReason;
  message?: string;
  result?: ResolvedPricingResult;
}

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_.\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeModel(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9\-_.]/g, "");
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function getDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function matchesModel(text: string, identity: PricingIdentity): boolean {
  if (!identity.normalizedModel) return false;
  return normalizeModel(text).includes(identity.normalizedModel);
}

export function trimPriceOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const sorted = [...prices].sort((left, right) => left - right);
  const median = sorted[Math.floor(sorted.length / 2)];
  return sorted.filter((price) => price >= median * 0.25 && price <= median * 3);
}

export function summarizePrices(prices: number[]): {
  lowPrice?: number;
  highPrice?: number;
  medianPrice?: number;
} {
  if (prices.length === 0) return {};
  const sorted = [...prices].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  const medianPrice =
    sorted.length % 2 === 0 ? Math.round((sorted[midpoint - 1] + sorted[midpoint]) / 2) : sorted[midpoint];
  return {
    lowPrice: sorted[0],
    highPrice: sorted[sorted.length - 1],
    medianPrice,
  };
}

export function estimateConfidence(input: {
  prices: number[];
  sources: EvidenceItem[];
  exactMatchCount?: number;
}): number {
  const strongSources = input.sources.filter((source) => source.relevanceScore >= 0.7).length;
  const exactMatches = input.exactMatchCount ?? 0;
  if (input.prices.length >= 6 && exactMatches >= 2 && strongSources >= 3) return 0.88;
  if (input.prices.length >= 4 && exactMatches >= 1) return 0.78;
  if (input.prices.length >= 4 && strongSources >= 1) return 0.72;
  if (input.prices.length >= 4) return 0.62;
  if (input.prices.length >= 2 && strongSources >= 1) return 0.56;
  if (input.prices.length >= 2) return 0.48;
  if (input.prices.length === 1) return 0.36;
  return input.sources.length > 0 ? 0.25 : 0;
}

export function buildEvidenceSummary(input: {
  sourceType: ResolvedPricingResult["sourceType"];
  prices: number[];
  sources: EvidenceItem[];
  exactMatches: number;
}): string {
  if (input.prices.length === 0) {
    return `${input.sourceType} returned sources, but no structured price values were extracted.`;
  }
  const redemptionSignals =
    input.sourceType === "ebay_browse"
      ? `${input.exactMatches} exact model match(es)`
      : input.sourceType === "pricecharting"
        ? "structured price guide data"
        : "discovery-only web snippets";
  return `Detected ${input.prices.length} price signal(s) across ${input.sources.length} ${input.sourceType} source(s); ${redemptionSignals}.`;
}

