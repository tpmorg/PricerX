# Task 0004: Pricing Lookup Spike — CLOSED

## Outcome

Spike concluded with a **negative result**: Brave Web Search alone cannot provide reliable structured pricing for the scan-identify-price-save loop. Brave returns search-result snippets (title, URL, ~150-char description) and does not extract retail `Offer` schema or marketplace sale prices. The regex on snippets produced empty `detectedPrice` values on ~95%+ of evidence rows, so `lowPrice`/`highPrice`/`medianPrice` were omitted from the response and no usable value range reached the UI.

This was the expected outcome per the spike's own non-goals: *"Do not overfit to Brave response shape before the first real API test"* and *"production-grade evidence ranking"* were both out of scope. The spike succeeded in proving its negative hypothesis.

## What was proven

- The `PricingProvider` interface shape is correct and stable.
- The Convex action boundary correctly hides server-side API keys from the mobile client.
- Cache-key generation from normalized brand/model/category/name is reusable across providers.
- The mobile client adapter (`convexPricingProvider.ts`) correctly consumes the structured `{ ok, result | reason }` response.
- The "no fake certainty" rule from PRD §9 held — empty evidence produced typed failures, not invented prices.

## What changed

See task 0006 and `docs/PRICING_SOURCES.md` for the structured-provider pivot that replaced this spike.

## Status

Closed. No further Brave-only work is planned.