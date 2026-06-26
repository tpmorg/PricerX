# Pricernu Decision Log

This file indexes major product and architecture decisions. Use `docs/adr/` for detailed decision records as they are created.

## Accepted Decisions

### D-0001: Local-first product architecture

Status: accepted

Decision: SQLite is the immediate local source of truth. Cloud sync augments local state but does not replace it.

Rationale: The product promise depends on speed, privacy, offline use, and durable local memory.

### D-0002: Expo React Native for initial mobile app

Status: accepted

Decision: Use Expo React Native for the initial mobile application.

Rationale: Fast iteration, cross-platform path, strong ecosystem, and compatibility with the user's existing React/Expo experience.

### D-0003: Clerk for optional auth

Status: accepted

Decision: Use Clerk for account identity and future entitlement/account linking.

Rationale: The user likes Clerk and it keeps auth out of the core product work.

### D-0004: Convex for cloud sync and backend actions

Status: accepted

Decision: Use Convex for synced user data, canonical object cache, backend actions, and credit accounting.

Rationale: Strong default sync model, good fit with Clerk, and lower operational burden than custom backend plumbing.

### D-0005: Brave Search API as initial pricing discovery provider

Status: accepted

Decision: Use Brave Search API for the first pricing enrichment spike.

Rationale: Reasonable cost, general web coverage, and easy server-side integration.

### D-0006: One-time Pro plus credits

Status: accepted

Decision: Launch monetization should avoid subscriptions. Use one-time Pro purchase plus consumable cloud credits.

Rationale: Aligns user trust with actual variable costs and differentiates from dark-pattern competitors.

### D-0007: Provider abstractions before concrete AI providers

Status: accepted

Decision: Implement recognition, OCR, and pricing behind provider interfaces.

Rationale: Gemini Nano and other local AI availability may vary. The app should not be hard-coded to one model or provider.

## Pending Decisions

### P-0001: Photo sync strategy

Options:

- local photos only in v1
- Convex file storage
- Cloudflare R2
- user-controlled export/backup

Default recommendation: local photos only for v1; sync metadata first.

### P-0002: Local database access layer

Options:

- raw SQL
- Drizzle
- lightweight repository layer

Default recommendation: start with a small repository layer over explicit SQL migrations.

### P-0003: Anonymous cloud enrichment abuse control

Options:

- device-local free allowance only
- anonymous server token
- require sign-in before any cloud enrichment
- require sign-in after tiny free allowance

Default recommendation: local use without account; cloud enrichment after small free allowance requires account or purchase.

### P-0004: Android-first beta vs simultaneous iOS

Default recommendation: Android-first because local Gemini Nano/native AI experimentation is strategically important.

### P-0005: Initial Pro credit grant

Options:

- 500 credits
- 1000 credits
- 2500 credits

Default recommendation: 1000 credits with $19.99 Pro.

## Decision Record Format

Detailed ADRs should follow:

```md
# ADR-000X: Title

## Status

Accepted / Proposed / Superseded

## Context

What forces led to this decision?

## Decision

What did we choose?

## Alternatives Considered

What else did we consider?

## Consequences

What gets better or worse because of this?
```
