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
  isMusicGearIdentity,
  matchesModel,
  stripHtml,
  summarizePrices,
  trimPriceOutliers,
} from "./sharedPricing";

const REVERB_LISTINGS_URL = "https://api.reverb.com/api/listings";
const REVERB_ACCEPT_VERSION = "3.0";
const PRICE_CEILING = 100000;

interface ReverbMoney {
  amount?: string;
  currency?: string;
  display?: string;
}

interface ReverbRate {
  rate?: ReverbMoney;
}

interface ReverbListing {
  id?: number;
  title?: string;
  make?: string;
  model?: string;
  description?: string;
  condition?: {
    display_name?: string;
    slug?: string;
  };
  price?: ReverbMoney;
  categories?: Array<{ full_name?: string }>;
  shipping?: {
    rates?: ReverbRate[];
  };
  _links?: {
    web?: { href?: string };
  };
}

interface ReverbListingsResponse {
  total?: number;
  listings?: ReverbListing[];
}

export async function lookupReverbPricing(input: {
  identity: PricingIdentity;
  query: string;
  condition?: ConditionGrade;
}): Promise<ProviderOutcome> {
  if (!isMusicGearIdentity(input.identity, input.query)) {
    return {
      ok: false,
      skip: true,
      reason: "no_results",
      message: "Identity does not look like music gear; skipping Reverb.",
    };
  }

  const searchQuery = buildReverbSearchQuery(input.identity, input.query);

  let response: Response;
  try {
    response = await fetch(
      `${REVERB_LISTINGS_URL}?${new URLSearchParams({
        query: searchQuery,
        per_page: "24",
      })}`,
      {
        headers: {
          Accept: "application/hal+json",
          "Accept-Version": REVERB_ACCEPT_VERSION,
        },
      },
    );
  } catch (error) {
    return {
      ok: false,
      skip: true,
      reason: "network_error",
      message: error instanceof Error ? error.message : "Reverb listings request failed.",
    };
  }

  if (response.status === 429) {
    return { ok: false, skip: true, reason: "rate_limited", message: "Reverb rate-limited." };
  }
  if (!response.ok) {
    return {
      ok: false,
      skip: true,
      reason: "provider_error",
      message: `Reverb returned HTTP ${response.status}.`,
    };
  }

  const payload = (await response.json()) as ReverbListingsResponse;
  const rawListings = (payload.listings ?? []).filter((listing) => matchesConditionGrade(listing, input.condition));
  const normalizedSources = rawListings
    .map((listing, index) => toReverbEvidence(listing, input.identity, searchQuery, index + 1))
    .filter((source): source is EvidenceItem => source !== null)
    .filter((source) => source.detectedPrice !== undefined);
  const sources = normalizedSources
    .slice(0, MAX_EVIDENCE_ITEMS);

  if (sources.length === 0) {
    return {
      ok: false,
      skip: true,
      reason: "no_results",
      message: `Reverb returned no usable listings for query "${searchQuery}". total=${payload.total ?? 0}, rawListings=${rawListings.length}, normalized=${normalizedSources.length}.`,
    };
  }

  const prices = trimPriceOutliers(
    sources
      .map((source) => source.detectedPrice)
      .filter(
        (price): price is number =>
          typeof price === "number" && Number.isFinite(price) && price > 0 && price < PRICE_CEILING,
      ),
  );

  if (prices.length === 0) {
    return { ok: false, skip: true, reason: "no_results", message: "No Reverb prices extracted." };
  }

  const exactMatches = sources.filter((source) => source.exactModelMatch).length;
  const range = summarizePrices(prices);
  const confidence = Math.max(
    0.62,
    estimateConfidence({ prices, sources, exactMatchCount: exactMatches }),
  );

  const result: ResolvedPricingResult = {
    currency: DEFAULT_CURRENCY,
    confidence,
    sourceType: "reverb_listing",
    evidenceSummary: buildEvidenceSummary({
      sourceType: "reverb_listing",
      prices,
      sources,
      exactMatches,
    }),
    sources,
    searchQueries: [searchQuery],
    lookupCacheKey: "",
    creditCost: 0,
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

function buildReverbSearchQuery(identity: PricingIdentity, suggestedQuery: string): string {
  const brandModel = [identity.brand, identity.model].filter(Boolean).join(" ").trim();
  if (brandModel) return brandModel;

  const exactName = [identity.brand, identity.model, identity.category ?? identity.displayName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (exactName) return exactName;

  return suggestedQuery.replace(/(used price|new price|sold price|value)$/i, "").trim() || identity.displayName;
}

function toReverbEvidence(
  listing: ReverbListing,
  identity: PricingIdentity,
  query: string,
  rank: number,
): EvidenceItem | null {
  const basePrice = parseMoney(listing.price);
  if (basePrice === undefined) return null;

  const shipping = parseMoney(listing.shipping?.rates?.[0]?.rate) ?? 0;
  const total = Number((basePrice + shipping).toFixed(2));
  const title = listing.title?.trim() || [listing.make, listing.model].filter(Boolean).join(" ").trim() || "Reverb listing";
  const url = listing._links?.web?.href;
  const domain = getDomain(url) ?? "reverb.com";
  const condition = listing.condition?.display_name?.trim();
  const categoryNames = (listing.categories ?? [])
    .map((category) => category.full_name?.trim())
    .filter((category): category is string => Boolean(category));
  const snippetParts = [condition, categoryNames[0], stripHtml(listing.description ?? "").slice(0, 160)].filter(Boolean);
  const exactMatch = matchesModel(`${title} ${listing.make ?? ""} ${listing.model ?? ""}`, identity);

  const reasons = ["reverb listing", "music gear marketplace"];
  if (exactMatch) reasons.push("model match");
  if (condition) reasons.push(`condition: ${condition.toLowerCase()}`);
  if (shipping > 0) reasons.push("includes shipping");

  return {
    title,
    ...(url ? { url } : {}),
    domain,
    ...(snippetParts.length > 0 ? { snippet: snippetParts.join(" · ") } : {}),
    detectedPrice: total,
    priceText: shipping > 0 ? `$${total.toFixed(2)} (incl shipping)` : `$${total.toFixed(2)}`,
    currency: listing.price?.currency ?? DEFAULT_CURRENCY,
    sourceType: "reverb_listing",
    relevanceScore: exactMatch ? 0.95 : 0.72 + Math.max(0, 0.18 - rank * 0.02),
    exactModelMatch: exactMatch,
    marketplaceType: "music_marketplace",
    query,
    rank,
    reasons,
  };
}

// Reverb grades listings as Brand New, B-Stock, Mint ... Poor, Non Functioning.
// Listings without a grade are kept so sparse results are not emptied out.
function matchesConditionGrade(listing: ReverbListing, condition: ConditionGrade | undefined): boolean {
  const grade = listing.condition?.display_name?.trim().toLowerCase();
  if (!condition || !grade) return true;

  const isNew = grade === "brand new" || grade === "b-stock";
  const isForParts = grade === "non functioning";
  switch (condition) {
    case "new":
      return isNew;
    case "for_parts":
      return isForParts;
    case "used":
      return !isNew && !isForParts;
  }
}

function parseMoney(money: ReverbMoney | undefined): number | undefined {
  if (!money?.amount) return undefined;
  const parsed = Number(money.amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}
