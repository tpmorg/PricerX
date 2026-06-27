import { v } from "convex/values";
import { action } from "./_generated/server";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_CURRENCY = "USD";
const SEARCH_RESULT_COUNT = "8";
const MAX_QUERIES = 4;
const MAX_EVIDENCE_ITEMS = 12;
const RESALE_DOMAINS = [
  "ebay.com",
  "mercari.com",
  "offerup.com",
  "craigslist.org",
  "facebook.com",
  "reverb.com",
  "swappa.com",
  "poshmark.com",
];
const RETAIL_DOMAINS = [
  "amazon.com",
  "walmart.com",
  "bestbuy.com",
  "homedepot.com",
  "lowes.com",
  "target.com",
  "costco.com",
  "bhphotovideo.com",
];

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
  handler: async (_ctx, args) => {
    const lookupCacheKey = buildCacheKey(args.identity);
    const createdAt = new Date().toISOString();

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

    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        reason: "missing_api_key",
        message: "BRAVE_SEARCH_API_KEY is not configured on the Convex backend.",
        lookupCacheKey,
        creditCost: 0,
        createdAt,
      };
    }

    const queries = buildSearchQueries(args.identity, args.query, args.condition);
    const searchResults: SearchResult[] = [];

    for (const query of queries) {
      let response: Response;

      try {
        response = await fetch(
          `${BRAVE_SEARCH_URL}?${new URLSearchParams({ q: query, count: SEARCH_RESULT_COUNT })}`,
          {
            headers: {
              Accept: "application/json",
              "X-Subscription-Token": apiKey,
            },
          },
        );
      } catch (error) {
        return {
          ok: false,
          reason: "network_error",
          message: error instanceof Error ? error.message : "Brave Search request failed.",
          lookupCacheKey,
          creditCost: 0,
          createdAt,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          reason: "provider_error",
          message: `Brave Search returned HTTP ${response.status}.`,
          lookupCacheKey,
          creditCost: 0,
          createdAt,
        };
      }

      const payload = (await response.json()) as BraveSearchResponse;
      const results = (payload.web?.results ?? []).map((result, index) => ({
        result,
        query,
        rank: index + 1,
      }));
      searchResults.push(...results);
    }

    const sources = dedupeEvidence(
      searchResults.map(({ result, query, rank }) => toEvidenceItem(result, args.identity, query, rank)),
    )
      .sort((left, right) => right.relevanceScore - left.relevanceScore)
      .slice(0, MAX_EVIDENCE_ITEMS);
    const priceCandidates = sources
      .map((source) => source.detectedPrice)
      .filter((price): price is number => typeof price === "number" && Number.isFinite(price));
    const prices = trimPriceOutliers(priceCandidates);

    if (sources.length === 0) {
      return {
        ok: false,
        reason: "no_results",
        message: "Brave Search returned no web results for this pricing query.",
        lookupCacheKey,
        creditCost: 0,
        createdAt,
      };
    }

    const range = summarizePrices(prices);
    const confidence = estimateConfidence({ prices, sources });

    return {
      ok: true,
      result: {
        currency: DEFAULT_CURRENCY,
        confidence,
        sourceType: "brave_search",
        evidenceSummary: buildEvidenceSummary({ prices, sources }),
        sources,
        searchQueries: queries,
        lookupCacheKey,
        creditCost: 1,
        createdAt,
        ...(range.lowPrice !== undefined ? { lowPrice: range.lowPrice, suggestedBuyPrice: range.lowPrice } : {}),
        ...(range.highPrice !== undefined ? { highPrice: range.highPrice, suggestedListPrice: range.highPrice } : {}),
        ...(range.medianPrice !== undefined ? { medianPrice: range.medianPrice } : {}),
      },
    };
  },
});

interface PricingIdentity {
  displayName: string;
  normalizedName: string;
  brand?: string;
  normalizedBrand?: string;
  model?: string;
  normalizedModel?: string;
  category?: string;
  variant?: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveSearchResult[];
  };
}

interface BraveSearchResult {
  title?: string;
  url?: string;
  description?: string;
  profile?: {
    name?: string;
  };
}

interface EvidenceItem {
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

interface SearchResult {
  result: BraveSearchResult;
  query: string;
  rank: number;
}

function buildSearchQueries(identity: PricingIdentity, suggestedQuery: string, condition: string | undefined): string[] {
  const exactName = [identity.brand, identity.model, identity.category ?? identity.displayName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const quotedModel = [identity.brand, identity.model].filter(Boolean).join(" ").trim();
  const normalizedCondition = condition?.toLowerCase().includes("new") ? "new" : "used";
  const queries = [
    suggestedQuery,
    [quotedModel ? `"${quotedModel}"` : exactName, normalizedCondition, "price"].filter(Boolean).join(" "),
    [exactName || identity.displayName, "sold used price ebay mercari offerup"].filter(Boolean).join(" "),
    [exactName || identity.displayName, "retail price amazon walmart best buy home depot lowes"].filter(Boolean).join(" "),
  ];

  return [...new Set(queries.map((query) => query.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, MAX_QUERIES);
}

function buildCacheKey(identity: PricingIdentity): string {
  return [
    identity.normalizedBrand ?? "",
    identity.normalizedModel ?? "",
    identity.category ? normalizeText(identity.category) : "",
    identity.normalizedName,
  ].join("|");
}

function toEvidenceItem(
  result: BraveSearchResult,
  identity: PricingIdentity,
  query: string,
  rank: number,
): EvidenceItem {
  const title = stripHtml(result.title ?? "Untitled result");
  const snippet = stripHtml(result.description ?? "");
  const detected = detectBestPrice(`${title} ${snippet}`);
  const domain = getDomain(result.url);
  const marketplaceType = classifyDomain(domain);
  const exactModelMatch = matchesModel(`${title} ${snippet}`, identity);
  const scored = scoreResult({
    title,
    snippet,
    domain,
    marketplaceType,
    exactModelMatch,
    detectedPrice: detected?.value,
    rank,
  });

  return {
    title,
    sourceType: "web",
    relevanceScore: scored.score,
    exactModelMatch,
    marketplaceType,
    query,
    rank,
    reasons: scored.reasons,
    ...(result.url ? { url: result.url } : {}),
    ...(domain ? { domain } : {}),
    ...(snippet ? { snippet } : {}),
    ...(detected ? { detectedPrice: detected.value, priceText: detected.text, currency: DEFAULT_CURRENCY } : {}),
  };
}

function detectBestPrice(text: string): { value: number; text: string } | undefined {
  const matches = [...text.matchAll(/\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/g)];
  const prices = matches
    .map((match) => {
      const rawValue = match[1];
      if (!rawValue) return null;
      const value = Number(rawValue.replace(/,/g, ""));
      if (!Number.isFinite(value) || value <= 0 || value > 25000) return null;
      return { value, text: match[0].replace(/\s+/g, " ") };
    })
    .filter((price): price is { value: number; text: string } => price !== null)
    .sort((left, right) => left.value - right.value);

  if (prices.length === 0) return undefined;
  return prices[Math.floor(prices.length / 2)];
}

function classifyDomain(domain: string | undefined): string {
  if (!domain) return "unknown";
  if (RESALE_DOMAINS.some((candidate) => domain === candidate || domain.endsWith(`.${candidate}`))) {
    return "resale_marketplace";
  }
  if (RETAIL_DOMAINS.some((candidate) => domain === candidate || domain.endsWith(`.${candidate}`))) {
    return "retailer";
  }
  return "web";
}

function matchesModel(text: string, identity: PricingIdentity): boolean {
  if (!identity.normalizedModel) return false;
  return normalizeModel(text).includes(identity.normalizedModel);
}

function scoreResult(input: {
  title: string;
  snippet: string;
  domain?: string;
  marketplaceType: string;
  exactModelMatch: boolean;
  detectedPrice?: number;
  rank: number;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0.18;

  if (input.detectedPrice !== undefined) {
    score += 0.26;
    reasons.push("price found");
  }
  if (input.exactModelMatch) {
    score += 0.24;
    reasons.push("model match");
  }
  if (input.marketplaceType === "resale_marketplace") {
    score += 0.2;
    reasons.push("resale marketplace");
  }
  if (input.marketplaceType === "retailer") {
    score += 0.12;
    reasons.push("retailer");
  }
  if (/\b(used|pre-owned|refurbished|open box|sold|completed)\b/i.test(`${input.title} ${input.snippet}`)) {
    score += 0.1;
    reasons.push("condition signal");
  }
  if (input.rank <= 3) {
    score += 0.06;
    reasons.push("top result");
  }

  return {
    score: Math.min(0.98, Number(score.toFixed(2))),
    reasons,
  };
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const bestByKey = new Map<string, EvidenceItem>();

  for (const item of items) {
    const key = item.url ?? `${item.domain ?? "unknown"}:${normalizeText(item.title)}`;
    const current = bestByKey.get(key);
    if (!current || item.relevanceScore > current.relevanceScore) {
      bestByKey.set(key, item);
    }
  }

  return [...bestByKey.values()];
}

function trimPriceOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;
  const sorted = [...prices].sort((left, right) => left - right);
  const median = sorted[Math.floor(sorted.length / 2)];
  return sorted.filter((price) => price >= median * 0.25 && price <= median * 3);
}

function summarizePrices(prices: number[]): {
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

function estimateConfidence(input: { prices: number[]; sources: EvidenceItem[] }): number {
  const strongSources = input.sources.filter((source) => source.relevanceScore >= 0.7).length;
  if (input.prices.length >= 4 && strongSources >= 3) return 0.82;
  if (input.prices.length >= 4) return 0.72;
  if (input.prices.length >= 2 && strongSources >= 1) return 0.64;
  if (input.prices.length >= 2) return 0.56;
  if (input.prices.length === 1) return 0.38;
  return input.sources.length > 0 ? 0.25 : 0;
}

function buildEvidenceSummary(input: { prices: number[]; sources: EvidenceItem[] }): string {
  if (input.prices.length === 0) {
    return "Brave returned sources, but no price-like values were detected in result titles or snippets.";
  }

  const resaleCount = input.sources.filter((source) => source.marketplaceType === "resale_marketplace").length;
  const retailerCount = input.sources.filter((source) => source.marketplaceType === "retailer").length;
  return `Detected ${input.prices.length} price signal(s) across ${input.sources.length} Brave result(s), including ${resaleCount} resale and ${retailerCount} retail source(s).`;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_.\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeModel(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9\-_.]/g, "");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function getDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
