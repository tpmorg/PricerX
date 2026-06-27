import { v } from "convex/values";
import { action } from "./_generated/server";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_CURRENCY = "USD";

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

    const query = buildSearchQuery(args.query, args.condition);
    let response: Response;

    try {
      response = await fetch(`${BRAVE_SEARCH_URL}?${new URLSearchParams({ q: query, count: "10" })}`, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      });
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
    const sources = (payload.web?.results ?? []).map(toEvidenceItem).slice(0, 10);
    const prices = sources
      .map((source) => source.detectedPrice)
      .filter((price): price is number => typeof price === "number" && Number.isFinite(price));

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
  currency?: string;
  sourceType: string;
  relevanceScore: number;
  exactModelMatch: boolean;
}

function buildSearchQuery(query: string, condition: string | undefined): string {
  return [query.trim(), condition?.trim(), "used price"].filter(Boolean).join(" ");
}

function buildCacheKey(identity: PricingIdentity): string {
  return [
    identity.normalizedBrand ?? "",
    identity.normalizedModel ?? "",
    identity.category ? normalizeText(identity.category) : "",
    identity.normalizedName,
  ].join("|");
}

function toEvidenceItem(result: BraveSearchResult): EvidenceItem {
  const title = stripHtml(result.title ?? "Untitled result");
  const snippet = stripHtml(result.description ?? "");
  const detectedPrice = detectPrice(`${title} ${snippet}`);
  const domain = getDomain(result.url);

  return {
    title,
    sourceType: "web",
    relevanceScore: detectedPrice === undefined ? 0.35 : 0.65,
    exactModelMatch: false,
    ...(result.url ? { url: result.url } : {}),
    ...(domain ? { domain } : {}),
    ...(snippet ? { snippet } : {}),
    ...(detectedPrice !== undefined ? { detectedPrice, currency: DEFAULT_CURRENCY } : {}),
  };
}

function detectPrice(text: string): number | undefined {
  const match = text.match(/\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/);
  if (!match?.[1]) return undefined;

  const parsed = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
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
  if (input.prices.length >= 4) return 0.72;
  if (input.prices.length >= 2) return 0.58;
  if (input.prices.length === 1) return 0.42;
  return input.sources.length > 0 ? 0.25 : 0;
}

function buildEvidenceSummary(input: { prices: number[]; sources: EvidenceItem[] }): string {
  if (input.prices.length === 0) {
    return "Brave returned sources, but no price-like values were detected in result titles or snippets.";
  }

  return `Detected ${input.prices.length} price signal(s) across ${input.sources.length} Brave result(s). Treat as directional until sold-listing evidence is added.`;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_.\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
