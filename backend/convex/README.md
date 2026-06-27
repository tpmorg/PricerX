# Pricernu Convex Backend

Server-side coordination layer for cache-backed pricing, future sync, and credit accounting.

## Local Setup

From the repository root:

```sh
npm install
npm run dev --workspace @pricernu/convex
```

Set the Brave key in Convex, not in the mobile app:

```sh
npx convex env set BRAVE_SEARCH_API_KEY your_key_here
```

## Pricing Spike

`convex/pricing.ts` exposes `lookupPricing`, a first server-side Brave Search action. It accepts normalized identity fields plus a suggested query and returns a typed success or failure result.

The action is intentionally small:

- API keys stay server-side.
- Results are ranges with evidence, not fake exact values.
- Cache keys are generated from normalized identity fields.
- `creditCost` is `0` when `cacheHit` is true and `1` for a fresh Brave lookup.
- Failed lookups return a typed failure with `creditCost: 0`.

Persistent Convex cache tables, auth, and the credit ledger come after the mobile local loop is building cleanly.
