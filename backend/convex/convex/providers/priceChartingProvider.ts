import type {
  ConditionGrade,
  EvidenceItem,
  PricingIdentity,
  ProviderOutcome,
  ResolvedPricingResult,
} from "./sharedPricing";
import {
  DEFAULT_CURRENCY,
  buildEvidenceSummary,
  estimateConfidence,
  summarizePrices,
  trimPriceOutliers,
} from "./sharedPricing";

const PRICECHARTING_SEARCH_URL = "https://www.pricecharting.com/api/search";
const PRICECEILING = 50000;

interface PriceChartingSearchItem {
  id?: string;
  "product-name"?: string;
  "console-name"?: string;
  "cib-price"?: string;
  "loose-price"?: string;
  "new-price"?: string;
  "game-url"?: string;
}

interface PriceChartingSearchResponse {
  "products"?: Array<PriceChartingSearchItem | string>;
  status?: string;
}

export async function lookupPriceChartingPricing(input: {
  identity: PricingIdentity;
  query: string;
  condition?: ConditionGrade;
}): Promise<ProviderOutcome> {
  if (input.condition === "for_parts") {
    return {
      ok: false,
      skip: true,
      reason: "no_results",
      message: "PriceCharting has no for-parts pricing; skipping.",
    };
  }

  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) {
    return {
      ok: false,
      skip: true,
      reason: "missing_credentials",
      message: "PRICECHARTING_API_TOKEN not configured on Convex.",
    };
  }

  const term = buildSearchTerm(input.identity, input.query);

  let searchResponse: Response;
  try {
    searchResponse = await fetch(
      `${PRICECHARTING_SEARCH_URL}?${new URLSearchParams({ q: term, t: token })}`,
      { headers: { Accept: "application/json" } },
    );
  } catch (error) {
    return {
      ok: false,
      skip: true,
      reason: "network_error",
      message: error instanceof Error ? error.message : "PriceCharting search failed.",
    };
  }

  if (searchResponse.status === 429) {
    return { ok: false, skip: true, reason: "rate_limited", message: "PriceCharting rate-limited." };
  }
  if (!searchResponse.ok) {
    return {
      ok: false,
      skip: true,
      reason: "provider_error",
      message: `PriceCharting returned HTTP ${searchResponse.status}.`,
    };
  }

  const payload = (await searchResponse.json()) as PriceChartingSearchResponse;
  const products = (payload.products ?? []).filter(
    (item): item is PriceChartingSearchItem => typeof item !== "string",
  );
  if (products.length === 0) {
    return { ok: false, skip: true, reason: "no_results", message: "PriceCharting returned no matches." };
  }

  const sources: EvidenceItem[] = products
    .slice(0, 10)
    .map((product, index) => toPriceChartingEvidence(product, input.identity, term, index + 1, input.condition))
    .filter((source): source is EvidenceItem => source !== null)
    .filter((source) => source.detectedPrice !== undefined);

  const prices = trimPriceOutliers(
    sources
      .map((source) => source.detectedPrice)
      .filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0 && price < PRICECEILING),
  );

  if (prices.length === 0) {
    return { ok: false, skip: true, reason: "no_results", message: "PriceCharting returned no price data." };
  }

  const exactMatches = sources.filter((s) => s.exactModelMatch).length;
  const range = summarizePrices(prices);
  const confidence = estimateConfidence({ prices, sources, exactMatchCount: exactMatches });

  const result: ResolvedPricingResult = {
    currency: DEFAULT_CURRENCY,
    confidence,
    sourceType: "pricecharting",
    evidenceSummary: buildEvidenceSummary({
      sourceType: "pricecharting",
      prices,
      sources,
      exactMatches,
    }),
    sources,
    searchQueries: [term],
    lookupCacheKey: "",
    creditCost: 1,
    createdAt: new Date().toISOString(),
    ...(range.lowPrice !== undefined
      ? { lowPrice: range.lowPrice, suggestedBuyPrice: range.lowPrice }
      : {}),
    ...(range.medianPrice !== undefined ? { medianPrice: range.medianPrice } : {}),
    ...(range.highPrice !== undefined
      ? { highPrice: range.highPrice, suggestedListPrice: range.highPrice }
      : {}),
    retailPrice: range.medianPrice ?? range.lowPrice,
  };

  return { ok: true, result };
}

function buildSearchTerm(identity: PricingIdentity, suggestedQuery: string): string {
  const quotedModel = [identity.brand, identity.model].filter(Boolean).join(" ").trim();
  if (quotedModel) return quotedModel;
  const exactName = [identity.brand, identity.model]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (exactName) return exactName;
  return suggestedQuery.replace(/(used price|new price|sold price)$/i, "").trim() || identity.displayName;
}

function toPriceChartingEvidence(
  product: PriceChartingSearchItem,
  identity: PricingIdentity,
  query: string,
  rank: number,
  condition: ConditionGrade | undefined,
): EvidenceItem | null {
  const name = product["product-name"];
  if (!name) return null;

  const loose = parsePrice(product["loose-price"]);
  const cib = parsePrice(product["cib-price"]);
  const newer = parsePrice(product["new-price"]);

  const conditions = [
    loose !== undefined && condition !== "new" && ["loose", loose],
    cib !== undefined && condition !== "new" && ["cib", cib],
    newer !== undefined && condition !== "used" && ["new", newer],
  ].filter(Boolean) as Array<[string, number]>;

  if (conditions.length === 0) return null;

  const avg =
    conditions.reduce((sum, [, price]) => sum + price, 0) / conditions.length;
  const consoleName = product["console-name"];
  const title = consoleName ? `${name} (${consoleName})` : name;
  const urlSuffix = product["game-url"];

  const exactMatch =
    Boolean(identity.normalizedModel) &&
    (identity.normalizedModel?.toLowerCase() === name.toLowerCase() ||
      name.toLowerCase().includes(identity.normalizedModel?.toLowerCase() ?? ""));

  const reasons: string[] = ["price guide data", ...conditions.map(([label]) => `${label} price`)];
  if (exactMatch) reasons.push("model match");

  return {
    title,
    url: urlSuffix ? `https://www.pricecharting.com${urlSuffix}` : undefined,
    domain: "pricecharting.com",
    snippet: conditions.map(([label, price]) => `${label}: $${price.toFixed(2)}`).join(", "),
    detectedPrice: Number(avg.toFixed(2)),
    priceText: `$${avg.toFixed(2)} avg (${conditions.map(([label]) => label).join("/")})`,
    currency: DEFAULT_CURRENCY,
    sourceType: "pricecharting",
    relevanceScore: exactMatch ? 0.95 : 0.7 + Math.max(0, 0.2 - rank * 0.03),
    exactModelMatch: exactMatch,
    marketplaceType: "price_guide",
    query,
    rank,
    reasons,
  };
}

function parsePrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return num;
}