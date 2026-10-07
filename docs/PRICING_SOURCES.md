# Pricernu Pricing Sources

This document records which pricing providers Pricernu uses, why they were chosen, and which popular marketplaces are intentionally excluded.

## TL;DR

Brave Web Search returns search-result snippets, not structured prices. As of task 0006 plus the Reverb spike, the live pricing path is **Reverb listings** for music gear, **eBay Browse API** (general structured fallback), **PriceCharting API** (games/electronics priceguide fallback), and **Brave Search** as a discovery-only last resort (returns candidate pages, no fake prices). Facebook Marketplace, OfferUp, and Amazon are intentionally NOT integrated.

## Live structured providers

### Reverb listings (`backend/convex/convex/providers/reverbProvider.ts`)

- **Endpoint:** `https://api.reverb.com/api/listings`
- **Headers used in the spike:** `Accept: application/hal+json`, `Accept-Version: 3.0`
- **Auth:** none for the current read-only spike; production access may later require registered app access per Reverb's API docs.
- **Returns:** structured listing records with title, make/model, condition, price, shipping, categories, and canonical web URLs.
- **Best fit:** guitars, basses, pedals, amps, synths, DJ gear, studio monitors, microphones, and other music/pro-audio equipment.
- **Pricing-to-evidence mapping:** each live listing becomes an `EvidenceItem` with `sourceType: "reverb_listing"`. Shipping is folded into the comparable price when present.
- **Credit cost:** `0` in the current spike, since it does not consume a paid partner API.
- **Operational note:** this provider only runs when the identity/query looks like music gear. It is intentionally backend-only so we can switch to official authenticated access later without touching the app.

### eBay Browse API (`backend/convex/convex/providers/ebayProvider.ts`)

- **Endpoint:** `https://api.ebay.com/buy/browse/v1/item_summary/search`
- **Auth:** `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` → OAuth2 client-credentials, scope `https://api.ebay.com/oauth/api_scope/buy.marketplace`.
- **Returns:** structured `itemSummaries[]` with `price.value`, `shippingOptions[].shippingCost.value`, condition, seller, item URL.
- **Filter:** `buyingOptions:FIXED_PRICE` to get asking prices, sorted by price ascending to capture the low end of the distribution.
- **Pricing-to-evidence mapping:** each listing becomes an `EvidenceItem` with `sourceType: "ebay_browse"`. Listings with no parseable price are dropped.
- **Best fit:** general resale market value for nearly all categories (tools, electronics, appliances, instruments, cameras, etc.).
- **Limits:** eBay does not expose sold/completed listings via the Browse API without an approved Sold-Item-Feed scope. Asking prices are higher than realized resale prices; a ~10–15% discount factor is suggested at the summarizer layer (not yet implemented).
- **Credit cost:** 1 per fresh lookup.
- **Status:** disabled via `PRICING_DISABLED_PROVIDERS=ebay` while developer access is pending. Remove `ebay` from that Convex env var once production keys are active; no deploy needed.

### PriceCharting API (`backend/convex/convex/providers/priceChartingProvider.ts`)

- **Endpoint:** `https://www.pricecharting.com/api/search`
- **Auth:** `PRICECHARTING_API_TOKEN` passed as `?t=<token>`.
- **Returns:** price-guide rows with `loose-price`, `cib-price` (complete-in-box), `new-price` — actual historical sold-price medians, not asking prices.
- **Best fit:** video games, retro consoles, board games, and consumer electronics with strong catalog-coverage by PriceCharting.
- **Pricing-to-evidence mapping:** per product, average across loose/CIB/new becomes `detectedPrice`; all three conditions appear in the snippet for transparency.
- **Credit cost:** 1 per fresh lookup.

## Convex canonical cache (`priceSnapshots` table)

See `backend/convex/convex/schema.ts` and `priceSnapshots.ts`.

The router action (`pricing.ts`) checks the canonical cache before calling any live provider. Successful structured results are written back with a 30-day TTL. A scheduled job (not yet implemented) should refresh popular snapshots weekly so that most lookups become cache hits and never spend a credit.

Cache hits return `sourceType: "convex_cache"` with `creditCost: 0`.

## Brave Search — discovery only (`braveProvider.ts`)

- **Endpoint:** `https://api.search.brave.com/res/v1/web/search`
- **Auth:** `BRAVE_SEARCH_API_KEY`.
- **Returns:** titles, URLs, ~150-char description snippets. No structured price data.
- **Pricing-to-evidence mapping:** a conservative regex still scans for literal `$` prices in snippets, but the result is tagged `sourceType: "brave_discovery"` with confidence capped at 0.18 — explicitly framed as discovery leads, not pricing evidence. No fake low/high/median ranges are emitted by this provider.
- **Role:** only used when every structured provider skips or fails. Useful for surfacing candidate pages the user could open manually (rare niche items, regional listings).

## Router priority (`backend/convex/convex/pricing.ts`)

```
lookupPricing(identity, query, condition)
  1. cache hit?            -> return convex_cache, creditCost: 0
  2. Reverb               -> structured music-gear prices when category fits
  3. eBay Browse          -> structured prices
  4. PriceCharting        -> structured prices (games/electronics)
  5. Brave Search         -> discovery leads only
  6. record winner -> priceSnapshots (TTL 30 days)
```

Strongly-typed sources (`reverb_listing`, `ebay_browse`, `pricecharting`) win immediately and the router stops. `brave_discovery` only persists if no structured source returned prices.

## Excluded providers (and why)

### Facebook Marketplace

- **No public API.** Meta does not expose Marketplace search via developer APIs.
- **ToS prohibits scraping.** Automated scraping of Facebook Marketplace violates Meta's Platform Terms and can lead to account/IP bans.
- **Listings are not indexed by Brave** in a structured way. Even discovery-only results rarely yield usable titles or prices.
- **PRD position.** `docs/PRD.md` §6 Non-Goals lists "Facebook Marketplace scraping" explicitly.

The only viable integration paths are user-driven:
- the user pastes a Marketplace URL and Pricernu parses the page locally (low investment, future feature), or
- a future "share to Pricernu"iOS/Android extension accepts Marketplace shares (best UX, no scraping).

### OfferUp

- **No public API.** OfferUp was acquired by Noah Education/AliPay and tightened data access; there is no developer search API.
- **ToS prohibits scraping.** Same category as Facebook Marketplace.
- **Search snippets don't surface prices reliably.** Discovery results that come back via Brave are title-only.

Treat OfferUp as user-paste-only, same as Facebook Marketplace.

### Craigslist

- **No official commercial API.** Craigslist does publish an RSS feed per category, but per-item prices are inconsistent.
- **ToS prohibits automated scraping.**

For now, exclude Craigslist from automated lookups.

### Amazon

- **Intentionally excluded as an organizational decision.** Amazon's Product Advertising API (PA-API) is gated on an Associates account that drives 3+ qualifying sales within a rolling 180-day window or access is revoked — a chicken-and-egg requirement that isn't worth working around for this product.
- **Pricernu focuses on resale market value**, which is well-served by eBay Browse + PriceCharting. Retail-new prices via Amazon are out of scope.
- **No provider scaffold exists** in the codebase; the router simply never calls Amazon.

## Required environment variables on Convex

```ini
EBAY_CLIENT_ID=...                     # eBay developer app "Client ID"
EBAY_CLIENT_SECRET=...                 # eBay developer app "Client Secret"
PRICECHARTING_API_TOKEN=...            # PriceCharting API token
BRAVE_SEARCH_API_KEY=...               # Brave Search API key (now discovery-only)
```

Set them via:

```sh
npx convex env set EBAY_CLIENT_ID your_key_here
npx convex env set EBAY_CLIENT_SECRET your_secret_here
npx convex env set PRICECHARTING_API_TOKEN your_token_here
```

Calls to the Convex action will skip any provider whose credential is missing and continue down the router. The system degrades gracefully: no eBay credentials means PriceCharting becomes the primary; no structured credentials at all means Brave discovery-only is used.

## Cost posture

| Provider | Per-call cost | Cache TTL | Credit cost |
|---|---|---|---|
| eBay Browse | Free quota (5,000 calls/day initial) | 30 days | 1 |
| PriceCharting | Paid plans from ~$10/1k calls | 30 days | 1 |
| Brave Search | Free tier 2,000/month; paid after | None (discovery-only) | 0 |
| convex_cache hit | Free | n/a | 0 |

## Future work

1. **Sold-listings scope for eBay:** apply for the Sold-Item-Feed access to capture realized sale prices instead of asking prices.
2. **Scheduled canonical-cache refresh job:** a Convex cron that refreshes the top N most-looked-up snapshots weekly so cache hits dominate production traffic.
3. **Summarizer tier:** apply category-aware discounting to asking prices (e.g., eBay asking prices compress ~10–15% to estimate realized resale).
4. **Marketplace-specific providers (Swappa, others):** expose behind `providers/<name>.ts` as needs and trust signals emerge.
5. **User-paste flow** for Facebook Marketplace / OfferUp / Craigslist URLs as a separate UI feature, outside the live pricing path.
