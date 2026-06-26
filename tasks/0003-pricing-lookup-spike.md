# Task 0003: Pricing Lookup Spike

## Goal

Prove the first cloud pricing lookup path without coupling the mobile app directly to paid APIs.

## Context

Pricernu should estimate realistic value ranges while remaining local-first and cost-aware. Fresh pricing evidence should be requested only after local cache checks, and external API keys must stay server-side.

This task should create the first implementation path for Brave Search backed pricing enrichment through the backend layer. It should be a spike, not a polished production pricing engine.

## Target Structure

```txt
/backend/convex
  pricing action or module
/apps/mobile
  pricing provider interface or client adapter
/packages/shared
  shared pricing types if useful
```

Adjust paths to match the repository structure at implementation time.

## Requirements

- Define a `PricingProvider` interface or equivalent boundary.
- Add shared types for pricing input and result output.
- Add a server-side Brave Search lookup action.
- Keep the Brave API key out of the mobile client.
- Accept a normalized object identity and suggested query.
- Return a value range, confidence, and evidence summaries.
- Include source metadata such as title, URL/domain, snippet, and detected price when available.
- Add a cache-key strategy that can be reused by local SQLite and Convex canonical cache work.
- Make cache hits free in the interface semantics, even if the initial spike uses mock cache data.
- Handle no-result and API-error cases without producing fake certainty.

## Pricing Result Shape

Minimum result fields:

- `currency`
- `lowPrice`
- `highPrice`
- `medianPrice`
- `suggestedListPrice`
- `suggestedBuyPrice`
- `confidence`
- `sourceType`
- `evidenceSummary`
- `sources`
- `lookupCacheKey`
- `creditCost`
- `createdAt`

## Acceptance Criteria

- A known object query can produce a structured pricing result.
- The result uses a range, not a fake exact value.
- The result includes evidence and caveats.
- API keys are only read server-side.
- Cache-hit semantics do not consume credits.
- Errors return a typed failure state suitable for UI display.
- The implementation is easy to replace with richer providers later.

## Non-Goals

- Full credit ledger implementation
- Payment integration
- Real marketplace scraping
- eBay sold-listing integration
- production-grade evidence ranking
- full Convex sync model
- polished result UI

## Notes For AI Agents

Prefer explicit provider boundaries and boring data shapes. Do not build a broad scraping framework. The spike should prove whether Brave Search can provide enough useful pricing evidence for common household, tool, and electronics objects.
