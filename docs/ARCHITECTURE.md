# Pricernu Architecture

## 1. Architectural Goal

Pricernu should be local-first, fast, privacy-respecting, and cheap to operate.

The architecture should make the common path local and the expensive path explicit.

## 2. System Overview

```txt
Expo React Native App
  |
  |-- SQLite local database
  |-- Local file storage
  |-- Recognition provider interface
  |-- OCR provider interface
  |-- Pricing provider interface
  |-- Sync queue
  |
  +-- Clerk optional auth
  |
  +-- Convex backend
        |
        |-- user sync
        |-- canonical object cache
        |-- priceSnapshots canonical pricing cache
        |-- credit ledger
        |-- backend actions
              |
              +-- Reverb listings API
              +-- eBay Browse API
              +-- PriceCharting API
              +-- Brave Search API (discovery only)
              +-- future cloud vision providers
```

## 3. Local Client Responsibilities

The mobile app owns the immediate user experience.

Responsibilities:

- capture object photos
- store scans locally
- run or invoke recognition providers
- run or invoke OCR providers
- check local cache first
- present results
- allow manual correction
- maintain offline queue
- sync when authenticated and online

The app should never require cloud availability for browsing existing local scans.

## 4. SQLite Responsibilities

SQLite is the local source of truth for:

- scans
- inventory items
- local photos
- recognition results
- OCR text
- price estimates
- lookup cache
- corrections
- sync queue
- app settings

SQLite is not merely a cache. It is the durable local object database.

## 5. Convex Responsibilities

Convex is the cloud coordination layer, not the primary app brain.

Responsibilities:

- authenticated user data
- cross-device sync
- canonical object cache
- global pricing snapshots
- credit ledger
- paid lookup orchestration
- backend actions for external APIs
- future export/report generation

Convex should reduce paid API calls by serving global cache hits for commonly scanned objects.

## 6. Clerk Responsibilities

Clerk handles optional user identity.

Responsibilities:

- sign-in
- account identity
- secure token integration with Convex
- future account linking and entitlement association

Auth must be optional for initial local use.

## 7. External API Responsibilities

### Reverb Listings API

Music-gear-specific structured listings for guitars, pedals, synths, recording gear, DJ gear, microphones, and related pro-audio equipment.

Used for:

- higher-signal comparable listings for instrument and audio categories
- condition-aware marketplace prices in a domain-specific marketplace
- structured listing extraction before general-market providers

This spike currently uses Reverb's public listings endpoint from the backend only. If Reverb later requires registered app auth for stable access, the provider can be upgraded without changing the mobile flow.

### eBay Browse API

Primary structured pricing provider for resale market value.

Used for:

- asking-price listings across categories
- comparable listings with condition and seller data
- structured price extraction (no regex on snippets)

eBay calls must happen server-side through Convex actions so API keys do not ship to the client.

### PriceCharting API

Structured price-guide medians for video games, retro consoles, and select electronics.

Used for:

- historical sold-price medians (loose / complete-in-box / new)
- coverage where eBay listings are sparse or speculative

### Brave Web Search

Discovery-only provider. Returns candidate pages for niche items where no structured provider has data. No structured prices are extracted from snippets; confidence is capped at 0.18.

### Excluded marketplaces

Amazon, Facebook Marketplace, OfferUp, and Craigslist are intentionally excluded as automated sources. Amazon's Product Advertising API is gated on an Associates account with ongoing qualifying sales (chicken-and-egg with new apps); the others have no public API and ToS prohibit scraping. See `docs/PRICING_SOURCES.md` for rationale and the user-paste-only alternative.

### Future Providers

Every provider should live behind the `PricingProvider` interface. Candidates:

- cloud vision model
- eBay sold-listing scope (requires approved access)
- Swappa API
- barcode/product APIs

## 8. Provider Interfaces

The app should define stable interfaces before concrete implementations.

### RecognitionProvider

Input:

- image URI
- optional OCR text
- optional hints

Output:

- object name
- brand
- model
- category
- variant
- condition notes
- confidence
- suggested pricing query
- raw provider metadata

### OCRProvider

Input:

- image URI

Output:

- text blocks
- model/serial candidates
- confidence

### PricingProvider

Input:

- normalized object identity
- search query
- category
- condition

Output:

- low estimate
- high estimate
- median estimate
- suggested list price
- suggested buy price
- confidence
- source summaries
- raw evidence metadata

### SyncProvider

Input:

- queued local mutations

Output:

- remote IDs
- conflict results
- synced snapshots

## 9. Lookup Flow

```txt
Scan object
  |
  v
Create local scan row
  |
  v
Run local recognition / OCR
  |
  v
Normalize identity
  |
  v
Check SQLite cache
  |
  +-- hit --> show cached result
  |
  v
Check Convex canonical cache if online/authenticated
  |
  +-- hit --> persist locally and show result
  |
  v
Ask user / consume available credit for cloud enrichment
  |
  v
Convex action calls Brave Search
  |
  v
Normalize pricing evidence
  |
  v
Persist in Convex + SQLite
  |
  v
Show result
```

## 10. Sync Model

Local writes happen first.

Remote sync follows.

Rules:

- user corrections beat AI guesses
- local records keep stable local IDs
- remote IDs are mapped when sync succeeds
- failed sync operations remain queued
- deleting locally should create a tombstone when synced users exist
- conflicts should be rare and explicit

## 11. Image Storage

MVP default:

- photos stored locally
- thumbnails stored locally
- Convex stores metadata only unless photo sync is explicitly added

Future photo sync options:

- Convex file storage if appropriate
- Cloudflare R2 for cheaper object storage
- user-controlled backup/export

Decision pending: photo sync in v1 or v1.5.

## 12. Credit Accounting

Credit ledger must be authoritative server-side.

The client may display cached balance, but Convex decides whether cloud enrichment is allowed.

Rules:

- cache hits do not consume credits
- failed lookups should not consume credits unless meaningful paid work was completed and returned
- duplicate in-flight lookup requests should be deduplicated where practical
- anonymous free credits require abuse controls

## 13. Offline Behavior

Offline supported:

- scan capture
- local history
- local edits
- local cached price estimates
- queued sync

Offline deferred:

- fresh Brave lookup
- cloud fallback recognition
- cross-device sync
- credit purchase verification

## 14. Initial Repository Shape

```txt
/apps/mobile       Expo app
/backend/convex    Convex backend
/packages/shared   Shared TypeScript types and utilities
/docs              Product and architecture docs
/tasks             Agent-ready implementation specs
```

## 15. Architectural Risks

### Local AI Availability

Gemini Nano availability may vary by platform/device. Use provider abstraction and ship with mock/cloud fallback path.

### Pricing Quality

General web search may be noisy. Show confidence and evidence. Avoid false precision.

### Cost Leakage

Free users can consume paid APIs. Use lifetime credits, cache-first lookup, and server-side rate limits.

### Sync Complexity

Do not build a custom distributed database. Keep local-first sync narrow and explicit.

### Feature Creep

Do not add marketplace automation, business features, or rich reports before the scan-identify-price-save loop works.
