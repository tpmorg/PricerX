import type {
  ConditionGrade,
  EvidenceItem,
  PricingIdentity,
  ProviderOutcome,
  ResolvedPricingResult,
} from "./sharedPricing";
import {
  DEFAULT_CURRENCY,
  MAX_EVIDENCE_ITEMS,
  buildEvidenceSummary,
  estimateConfidence,
  getDomain,
  matchesModel,
  summarizePrices,
  trimPriceOutliers,
} from "./sharedPricing";

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
// Browse search uses the base application scope with the client-credentials grant.
const EBAY_BROWSE_SCOPE = "https://api.ebay.com/oauth/api_scope";
const PRICE_CEILING = 100000;
// eBay condition ids: https://developer.ebay.com/api-docs/sell/static/metadata/condition-id-values.html
const EBAY_CONDITION_IDS: Record<ConditionGrade, string> = {
  new: "1000|1500",
  used: "2000|2010|2020|2030|2500|2750|3000|4000|5000|6000",
  for_parts: "7000",
};

interface EbayItemSummary {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  itemHref?: string;
  itemWebUrl?: string;
  categoryPath?: string;
  condition?: string;
  seller?: { username?: string; feedbackPercentage?: string };
  shippingOptions?: Array<{ shippingCost?: { value?: string; currency?: string } }>;
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
  total?: number;
  href?: string;
}

interface EbayTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function lookupEbayPricing(input: {
  identity: PricingIdentity;
  query: string;
  condition?: ConditionGrade;
}): Promise<ProviderOutcome> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      skip: true,
      reason: "missing_credentials",
      message: "EBAY_CLIENT_ID / EBAY_CLIENT_SECRET not configured on Convex.",
    };
  }

  const token = await fetchEbayAccessToken(clientId, clientSecret);
  if (!token) {
    return {
      ok: false,
      skip: true,
      reason: "provider_error",
      message: "eBay OAuth token request failed.",
    };
  }

  const searchQuery = buildEbaySearchQuery(input.identity, input.query);
  const filters = ["buyingOptions:{FIXED_PRICE}"];
  if (input.condition) filters.push(`conditionIds:{${EBAY_CONDITION_IDS[input.condition]}}`);
  let response: Response;
  try {
    response = await fetch(
      `${EBAY_BROWSE_SEARCH_URL}?${new URLSearchParams({
        q: searchQuery,
        limit: "50",
        filter: filters.join(","),
        sort: "price asc",
      })}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          Accept: "application/json",
        },
      },
    );
  } catch (error) {
    return {
      ok: false,
      skip: true,
      reason: "network_error",
      message: error instanceof Error ? error.message : "eBay Browse request failed.",
    };
  }

  if (response.status === 429) {
    return { ok: false, skip: true, reason: "rate_limited", message: "eBay rate-limited." };
  }
  if (!response.ok) {
    return {
      ok: false,
      skip: true,
      reason: "provider_error",
      message: `eBay Browse returned HTTP ${response.status}.`,
    };
  }

  const payload = (await response.json()) as EbaySearchResponse;
  const items = payload.itemSummaries ?? [];
  if (items.length === 0) {
    return { ok: false, skip: true, reason: "no_results", message: "eBay returned no items." };
  }

  const sources: EvidenceItem[] = items
    .map((item, index) => toEbayEvidence(item, input.identity, searchQuery, index + 1))
    .filter((source): source is EvidenceItem => source !== null)
    .filter((source) => source.detectedPrice !== undefined)
    .slice(0, MAX_EVIDENCE_ITEMS);

  const prices = trimPriceOutliers(
    sources
      .map((source) => source.detectedPrice)
      .filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0 && price < PRICE_CEILING),
  );

  if (prices.length === 0) {
    return { ok: false, skip: true, reason: "no_results", message: "No eBay prices extracted." };
  }

  const exactMatches = sources.filter((s) => s.exactModelMatch).length;
  const range = summarizePrices(prices);
  const confidence = estimateConfidence({ prices, sources, exactMatchCount: exactMatches });

  const result: ResolvedPricingResult = {
    currency: DEFAULT_CURRENCY,
    confidence,
    sourceType: "ebay_browse",
    evidenceSummary: buildEvidenceSummary({
      sourceType: "ebay_browse",
      prices,
      sources,
      exactMatches,
    }),
    sources,
    searchQueries: [searchQuery],
    lookupCacheKey: "",
    creditCost: 1,
    createdAt: new Date().toISOString(),
    ...(range.lowPrice !== undefined
      ? { lowPrice: range.lowPrice, suggestedBuyPrice: range.lowPrice }
      : {}),
    ...(range.highPrice !== undefined
      ? { highPrice: range.highPrice, suggestedListPrice: range.highPrice }
      : {}),
    ...(range.medianPrice !== undefined ? { medianPrice: range.medianPrice } : {}),
  };

  return { ok: true, result };
}

async function fetchEbayAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let response: Response;
  try {
    response = await fetch(EBAY_OAUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: EBAY_BROWSE_SCOPE,
      }),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const payload = (await response.json()) as EbayTokenResponse;
  return payload.access_token ?? null;
}

function buildEbaySearchQuery(identity: PricingIdentity, suggestedQuery: string): string {
  const quotedModel = [identity.brand, identity.model].filter(Boolean).join(" ").trim();
  if (quotedModel) return quotedModel;
  const exactName = [identity.brand, identity.model, identity.category ?? identity.displayName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (exactName) return exactName;
  return suggestedQuery.replace(/(used price|new price|sold price)$/i, "").trim() || identity.displayName;
}

function toEbayEvidence(
  item: EbayItemSummary,
  identity: PricingIdentity,
  query: string,
  rank: number,
): EvidenceItem | null {
  const priceValue = item.price?.value;
  const shippingValue = item.shippingOptions?.[0]?.shippingCost?.value;
  if (!priceValue) return null;
  const price = Number(priceValue);
  if (!Number.isFinite(price) || price <= 0) return null;
  const total = shippingValue ? price + Number(shippingValue) : price;

  const title = item.title ?? "eBay listing";
  const url = item.itemWebUrl ?? item.itemHref;
  const domain = getDomain(url) ?? "ebay.com";
  const condition = item.condition ?? "";
  const exactMatch = matchesModel(`${title} ${condition}`, identity);

  const reasons: string[] = ["eBay active listing", "asking price"];
  if (exactMatch) reasons.push("model match");
  if (condition) reasons.push(`condition: ${condition.toLowerCase()}`);

  return {
    title,
    url,
    domain,
    snippet: condition ? `Condition: ${condition}` : undefined,
    detectedPrice: Number(total.toFixed(2)),
    priceText: `$${total.toFixed(2)}${shippingValue ? " (incl shipping)" : ""}`,
    currency: item.price?.currency ?? DEFAULT_CURRENCY,
    sourceType: "ebay_browse",
    relevanceScore: exactMatch ? 0.92 : 0.6 + Math.max(0, 0.3 - rank * 0.02),
    exactModelMatch: exactMatch,
    marketplaceType: "resale_marketplace",
    query,
    rank,
    reasons,
  };
}