# Task 0006: Structured Pricing Feeds

## Goal

Replace the Brave-only pricing spike (0004) with structured-price providers behind the existing `PricingProvider` interface, plus a Convex canonical price-snapshot cache so most production lookups become cache hits and the live path is only used on cold identity queries.

## Context

Task 0004 concluded that Brave Web Search returns only snippets and cannot extract retail `Offer` schema or marketplace sale prices. As a result, the live pricing path returned evidence URLs with no price column. `docs/PRICING_SOURCES.md` documents the full rationale for the chosen providers and the exclusion of Facebook Marketplace, OfferUp, and Craigslist.

## Required structure

```txt
/backend/convex/convex
  schema.ts                         # priceSnapshots table
  priceSnapshots.ts                 # cache query + recordSnapshot mutation
  pricing.ts                        # router: cache -> eBay -> PriceCharting -> Amazon -> Brave discovery
  providers/
    sharedPricing.ts                # shared types, helpers, normalizers
    ebayProvider.ts                 # eBay Browse API adapter
    priceChartingProvider.ts        # PriceCharting API adapter
    amazonProvider.ts               # Amazon PA-API stub
    braveProvider.ts                # Brave Search adapter (discovery-only)
```

## Requirements

- Define a `priceSnapshots` Convex table indexed by `lookupCacheKey`.
- Implement `getFreshSnapshot` query (returns non-stale snapshots only).
- Implement `recordSnapshot` mutation.
- Rewrite `pricing.ts` `lookupPricing` action as a router:
  - 1. short-circuit if `cacheHit` is true
  - 2. canonical cache check (no credit cost)
  - 3. eBay Browse API (structured asking prices)
  - 4. PriceCharting API (price-guide medians)
  - 5. Amazon PA-API stub (scaffolded, returns `missing_credentials` until enabled)
  - 6. Brave Search (discovery-only, no fake prices, confidence capped at 0.18)
  - 7. record winner to `priceSnapshots` with 30-day TTL
- Strongly-typed providers (`ebay_browse`, `pricecharting`) short-circuit the router on first success.
- `brave_discovery` only persists if no structured provider returned prices.
- Each provider self-skip with `missing_credentials` when its env vars are unset. The router must not fail the whole action if some providers are unconfigured.
- Shared types: `PricingIdentity`, `EvidenceItem`, `ResolvedPricingResult`, `ProviderOutcome` live in `sharedPricing.ts` (no circular import with `pricing.ts`).
- Extend shared `PriceSourceType` enum in `packages/shared` with the new sources: `ebay_browse`, `pricecharting`, `amazon_paapi`, `brave_discovery`.
- Update the mobile client `convexPricingProvider.ts` response type to the new union.
- Update `docs/AI_PIPELINE.md` and `docs/ARCHITECTURE.md` to reflect the new fallback ordering and excluded providers.
- Write `docs/PRICING_SOURCES.md` documenting each provider, why chosen, ToS constraints, and excluded marketplaces.
- Update `.env.example` files with the new server-side keys.

## Acceptance criteria

- `npm run typecheck` passes for all three workspaces (`mobile`, `convex`, `shared`).
- The `lookupPricing` Convex action runs end-to-end without credentials configured — it should return a typed failure with `reason: "all_providers_failed"` listing each provider's skip reason, never throw.
- With at least `EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET` configured and eBay returning listings, the action returns a structured result with `sourceType: "ebay_browse"`, at least one `EvidenceItem` with `detectedPrice`, and a `lowPrice`/`highPrice`/`medianPrice` range.
- With only `BRAVE_SEARCH_API_KEY` configured (structured providers missing), the action returns `sourceType: "brave_discovery"` with `creditCost: 0` and no low/high/median — surfaced in UI as discovery leads.
- With `PRICECHARTING_API_TOKEN` configured for a game/electronics query, the action returns `sourceType: "pricecharting"` with loose/CIB/new signal evidence.
- A repeat call for the same identity (within TTL) returns `sourceType: "convex_cache"` and `creditCost: 0` from the canonical cache.
- No API keys appear in the mobile client bundle.

## Non-goals

- Credit ledger enforcement (still deferred to task 0007)
- Scheduled cache refresh cron (deferred to a separate task)
- Amazon PA-API implementation (only the stub envelope is in scope)
- eBay sold-listings scope (requires approved access)
- Summarizer discounting of asking prices (e.g., compress eBay asking prices ~10–15% to estimate realized resale)
- UI changes — the existing result screen already renders the estimate and evidence list
- Facebook Marketplace / OfferUp / Craigslist integrations (excluded per PRD §6)

## Notes for AI agents

- Do not block on Amazon. The stub is enough; implement AWS SigV4 signing in a follow-up task only after Associates approval.
- Run `npx convex codegen` after schema changes so `_generated/` types update before typecheck.
- Treat provider "skip" outcomes as soft failures. The action only fails if every provider skips or errors.
- Empty `prices` array → omit `lowPrice`/`highPrice`/`medianPrice` from the response. Never invent a price.