# Pricernu Constitution

This document defines the project rules that should change rarely. Product specs, architecture docs, and implementation tasks may evolve quickly; this document protects the core philosophy.

## 1. Product Thesis

Pricernu exists because most image-to-price apps are built around dark-pattern monetization and shallow AI wrappers.

Pricernu should be a durable utility: fast, local-first, privacy-respecting, honestly priced, and useful before an account exists.

## 2. Primary User Promise

A user should be able to open the app, scan an object, and receive useful object intelligence without first creating an account, accepting a subscription, or sending photos to the cloud unnecessarily.

## 3. Local First

SQLite on the device is the immediate source of truth for the app experience.

Cloud systems may augment the local database, but they must not be required for the core scan-history loop.

The app should degrade gracefully when offline:

- local scan history remains available
- locally cached recognitions remain available
- locally cached price estimates remain available
- pending sync operations are queued
- paid cloud lookups are deferred, not lost

## 4. Privacy First

Photos stay local by default.

Cloud upload is acceptable only when the user signs in, enables sync, or explicitly requests cloud enrichment. The UI must make this distinction understandable.

The app should avoid storing personal data it does not need.

## 5. Honest Monetization

No weekly subscription traps.

No fake free trials.

No paywall before the first useful result.

No confusing scan limits where local work is bundled with paid cloud work.

The preferred model:

- free local use
- one-time Pro purchase for ownership features
- included cloud credits
- additional credits for real cloud costs

## 6. Cache Before Cost

Paid API calls are a last resort.

The lookup order should be:

1. local SQLite cache
2. local user correction history
3. synced user cache
4. global canonical Convex cache
5. external paid lookup

Cloud credits should only be consumed when real cloud enrichment work occurs.

## 7. AI Is Infrastructure

The AI model is not the product.

AI supports object recognition, OCR interpretation, query generation, condition analysis, and evidence summarization. The product value comes from workflow, trust, history, correction, caching, and object intelligence.

## 8. Trust Over Magic

The app must show uncertainty.

Prefer ranges, confidence, and evidence over false precision.

Bad:

> This is worth $187.

Good:

> Likely Ryobi TSS103 sliding miter saw. Confidence 91%. Typical used range $120-$180. Fresh lookup performed today.

## 9. Prefer Boring Architecture

Use the simplest durable tool that fits the job.

Current default choices:

- Expo React Native for app shell
- SQLite for local state
- Clerk for optional auth
- Convex for sync and backend actions
- Brave Search API for pricing discovery
- provider abstraction for local/cloud AI

Do not add a new service unless it removes meaningful complexity or unlocks a necessary product capability.

## 10. Docs Are Product Infrastructure

Documentation is not secondary. It is the project memory.

Major features should begin with docs or task specs. Major architectural choices should be captured in decision records.

AI agents should not need chat history to understand the current product direction.

## 11. Small, Reviewable Work

Implementation should proceed in small, reviewable increments.

A good task:

- has a clear goal
- lists affected files
- has acceptance criteria
- is small enough for a human or coding agent to complete safely
- does not bundle unrelated architectural decisions

## 12. Guardrails Against Feature Creep

Interesting does not mean v1.

Future features such as insurance reports, marketplace listing automation, price trends, bulk reseller workflows, barcode databases, and business accounts belong in the roadmap until the scan-identify-price-save loop is excellent.

## 13. Default Decision Bias

When uncertain, choose:

- local over cloud
- explicit over magical
- cache over API
- one-time purchase over subscription
- evidence over assertion
- simple schema over clever abstraction
- useful utility over AI novelty

## 14. Definition of Success

Pricernu succeeds if users recommend it like this:

> I use this when I am at estate sales, thrift stores, or cleaning out the garage. It tells me what things are and what they are probably worth without trying to trap me in a subscription.
