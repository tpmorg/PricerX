# Task 0004: Pricing Lookup Spike

## Goal

Prove that Pricernu can enrich a recognized object with pricing evidence through a backend action and store the result locally.

## Context

Pricing is the first killer feature, but it must be cache-first and cost-aware. This task should validate the path from recognized identity to pricing evidence without building the full monetization system.

## Requirements

- Create a pricing provider interface.
- Add a mock pricing provider for local development.
- Scaffold Convex backend if not already present.
- Add a Convex action placeholder for Brave Search lookup.
- Keep Brave API key server-side only.
- Generate normalized pricing query from recognition result.
- Store price estimate locally.
- Display value range and confidence on scan/item detail.

## Suggested Pricing Output

```ts
export type PriceEstimate = {
  lowPrice?: number;
  highPrice?: number;
  medianPrice?: number;
  suggestedListPrice?: number;
  suggestedBuyPrice?: number;
  retailPrice?: number;
  currency: 'USD';
  confidence: number;
  sourceType: 'local_cache' | 'convex_cache' | 'brave_search' | 'mock';
  evidenceSummary?: string;
  raw?: unknown;
};
```

## Acceptance Criteria

- Mock pricing result can appear in UI.
- Local cache key is generated from brand/model/category/name.
- Price estimate persists locally.
- Convex action exists or is documented with a runnable placeholder.
- No API key is committed.
- UI makes source clear: mock/cache/fresh lookup.

## Non-Goals

- credit accounting
- real payments
- perfect evidence parsing
- multiple marketplace providers
- production-ready Brave parser

## Notes For AI Agents

Do not overfit to Brave response shape before the first real API test. Build a narrow adapter and keep raw evidence available for inspection.
