# Task 0010: Pricing Abuse Limits and Durable Photos

## Goal

Stop the public pricing action from being an open tap on paid provider quota, and make saved item photos survive OS cache cleanup.

## Why

- `pricing:lookupPricing` was a public, unauthenticated Convex action. Anyone with the deployment URL could drain Brave/eBay/PriceCharting quota.
- `priceSnapshots.recordSnapshot` was a public mutation, so anyone could write fake prices into the global cache.
- Camera and picker photos live in the OS cache directory. Saved items pointed at those temp files, which the OS may purge.

## Scope

- Make `priceSnapshots.getFreshSnapshot` / `recordSnapshot` internal-only.
- Require a per-install `deviceId` on `lookupPricing`; generate it on device (`src/features/device/installId.ts`).
- Fixed-window rate limits on fresh (non-cache) lookups in `rateLimits.ts`:
  - per device per hour / per day
  - global per day (the real cost ceiling, since device ids are spoofable)
  - limits overridable with `PRICING_DEVICE_HOURLY_LIMIT`, `PRICING_DEVICE_DAILY_LIMIT`, `PRICING_GLOBAL_DAILY_LIMIT`
  - daily cron prunes old windows
- Add `forceRefresh` so "Refresh Prices" bypasses the server cache (still rate-limited).
- Copy the photo into `Paths.document/item-photos/` on Save; delete stored files on scan delete and local reset.

## Non-goals

- Accounts, credits, or a server ledger (Phase 7).
- App Attest / Play Integrity device attestation.
- Migrating photos for items saved before this change.

## Notes

- Cache hits never count against limits.
- The global counter is a single hot document; fine at beta scale, revisit once lookups require auth.
