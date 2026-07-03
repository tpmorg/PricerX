import type {
  EvidenceItem,
  PricingIdentity,
  ProviderOutcome,
  ResolvedPricingResult,
} from "./sharedPricing";
import {
  DEFAULT_CURRENCY,
  MAX_EVIDENCE_ITEMS,
  getDomain,
  matchesModel,
  stripHtml,
} from "./sharedPricing";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const SEARCH_RESULT_COUNT = "8";
const MAX_QUERIES = 2;
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

interface SearchResult {
  result: BraveSearchResult;
  query: string;
  rank: number;
}

export async function lookupBraveDiscovery(input: {
  identity: PricingIdentity;
  query: string;
}): Promise<ProviderOutcome> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      skip: true,
      reason: "missing_credentials",
      message: "BRAVE_SEARCH_API_KEY not configured on Convex.",
    };
  }

  const queries = buildSearchQueries(input.identity, input.query);
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
        skip: true,
        reason: "network_error",
        message: error instanceof Error ? error.message : "Brave Search request failed.",
      };
    }

    if (response.status === 429) {
      return { ok: false, skip: true, reason: "rate_limited", message: "Brave rate-limited." };
    }
    if (!response.ok) {
      return {
        ok: false,
        skip: true,
        reason: "provider_error",
        message: `Brave Search returned HTTP ${response.status}.`,
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
    searchResults.map(({ result, query, rank }) => toEvidenceItem(result, input.identity, query, rank)),
  )
    .filter((source) => source.detectedPrice !== undefined || source.relevanceScore >= 0.4)
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, MAX_EVIDENCE_ITEMS);

  if (sources.length === 0) {
    return { ok: false, skip: true, reason: "no_results", message: "Brave returned no usable discovery evidence." };
  }

  const result: ResolvedPricingResult = {
    currency: DEFAULT_CURRENCY,
    confidence: 0.18,
    sourceType: "brave_discovery",
    evidenceSummary: `Discovery-only: ${sources.length} Brave result(s) surfaced as candidate pages. No structured prices extracted — these are discovery leads, not pricing evidence.`,
    sources,
    searchQueries: queries,
    lookupCacheKey: "",
    creditCost: 0,
    createdAt: new Date().toISOString(),
  };

  return { ok: true, result };
}

function buildSearchQueries(identity: PricingIdentity, suggestedQuery: string): string[] {
  const quotedModel = [identity.brand, identity.model].filter(Boolean).join(" ").trim();
  const exactName = [identity.brand, identity.model, identity.category ?? identity.displayName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const queries = [
    suggestedQuery,
    quotedModel ? `"${quotedModel}" price` : exactName ? `${exactName} price` : suggestedQuery,
  ];
  return [...new Set(queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, MAX_QUERIES);
}

function toEvidenceItem(
  result: BraveSearchResult,
  identity: PricingIdentity,
  query: string,
  rank: number,
): EvidenceItem {
  const title = stripHtml(result.title ?? "Untitled result");
  const snippet = stripHtml(result.description ?? "");
  const domain = getDomain(result.url);
  const marketplaceType = classifyDomain(domain);
  const exactModelMatch = matchesModel(`${title} ${snippet}`, identity);
  const detected = detectBestPrice(`${title} ${snippet}`);

  const sourceType = "web_discovery";
  const relevanceScore = computeRelevance({
    marketplaceType,
    exactModelMatch,
    detectedPrice: detected?.value,
    rank,
  });

  return {
    title,
    sourceType,
    relevanceScore,
    exactModelMatch,
    marketplaceType,
    query,
    rank,
    reasons: ["discovery lead"],
    ...(result.url ? { url: result.url } : {}),
    ...(domain ? { domain } : {}),
    ...(snippet ? { snippet } : {}),
    ...(detected ? { detectedPrice: detected.value, priceText: detected.text, currency: DEFAULT_CURRENCY } : {}),
  };
}

function detectBestPrice(text: string): { value: number; text: string } | undefined {
  const matches = [...text.matchAll(/\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g)];
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

function computeRelevance(input: {
  marketplaceType: string;
  exactModelMatch: boolean;
  detectedPrice?: number;
  rank: number;
}): number {
  let score = 0.1;
  if (input.detectedPrice !== undefined) score += 0.2;
  if (input.exactModelMatch) score += 0.25;
  if (input.marketplaceType === "resale_marketplace") score += 0.18;
  if (input.marketplaceType === "retailer") score += 0.1;
  if (input.rank <= 3) score += 0.05;
  return Math.min(0.85, Number(score.toFixed(2)));
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const bestByKey = new Map<string, EvidenceItem>();
  for (const item of items) {
    const key = item.url ?? `${item.domain ?? "unknown"}:${item.title}`;
    const current = bestByKey.get(key);
    if (!current || item.relevanceScore > current.relevanceScore) {
      bestByKey.set(key, item);
    }
  }
  return [...bestByKey.values()];
}