# Pricernu Roadmap

## 1. Strategy

Ship the smallest version that proves the product loop:

> Scan → identify → price → save → correct → remember.

Everything else is secondary until that loop feels fast, useful, and trustworthy.

## 2. Phase 0: Project Brain

Goal: make the repo useful to humans and AI agents before implementation.

Deliverables:

- README
- Constitution
- PRD
- Architecture
- Data model
- AI pipeline
- Monetization
- Roadmap
- Decision records
- Task specs

Status: in progress.

## 3. Phase 1: Mobile Skeleton

Goal: create the Expo app and local persistence foundation.

Deliverables:

- Expo app in `apps/mobile`
- TypeScript configuration
- basic navigation
- camera permission flow
- placeholder camera screen
- SQLite setup
- schema migrations
- local repository layer
- scan history screen with mock data

Success criteria:

- app runs locally
- SQLite can create and read scan rows
- navigation supports scan, history, detail, settings

## 4. Phase 2: Scan Capture

Goal: capture an image and save a local scan.

Deliverables:

- camera capture
- local image file persistence
- thumbnail generation if practical
- `scans` table write
- scan detail screen
- delete local scan

Success criteria:

- user can capture photo
- scan persists across app restarts
- scan appears in history

## 5. Phase 3: Recognition Stub

Goal: wire the recognition pipeline without depending on final AI provider.

Deliverables:

- `RecognitionProvider` interface
- `MockRecognitionProvider`
- recognition job state
- result card UI
- manual correction flow
- create/update inventory item from recognition result

Success criteria:

- captured scan receives a mock identity result
- user can edit recognized fields
- corrections persist locally

## 6. Phase 4: Pricing Spike

Goal: prove price enrichment through backend action and local cache.

Deliverables:

- Convex backend scaffold
- Brave Search API action
- pricing provider interface
- local cache key generation
- price estimate table writes
- result confidence/evidence display

Success criteria:

- known test objects can receive price evidence
- cache hit avoids repeat paid lookup
- result displays range and evidence caveats

## 7. Phase 5: Optional Auth + Sync

Goal: make account-based sync possible without weakening local-first behavior.

Deliverables:

- Clerk Expo integration
- Convex auth integration
- signed-in user profile
- sync queue flush
- remote inventory item records
- remote pricing snapshot cache

Success criteria:

- unauthenticated local use still works
- signed-in user can sync inventory metadata
- remote cache can avoid external lookup

## 8. Phase 6: Real Recognition

Goal: replace mock identity with real provider(s).

Deliverables:

- OCR provider path
- local model integration spike
- cloud fallback interface
- low-confidence handling
- label/model photo prompt

Success criteria:

- common household/tool/electronics objects identify with useful confidence
- app can ask for another photo when needed
- exact model numbers improve pricing query quality

## 9. Phase 7: Monetization Mechanics

Goal: implement purchase and credit logic.

Deliverables:

- entitlement model
- credit ledger
- Pro unlock model
- consumable credit packs
- server-side credit accounting
- UI for balance and lookup cost

Success criteria:

- cloud enrichment cost is clear
- local features remain free
- Pro and credit state can be restored

## 10. Phase 8: Private Beta

Goal: test real-world usefulness with a small user group.

Deliverables:

- beta distribution path
- seed test object list
- feedback capture
- error/crash logging
- lookup cost dashboard
- pricing quality review process

Success criteria:

- users complete real scans without coaching
- enough pricing results are useful to justify continued work
- API costs remain bounded

## 11. V1 Launch Scope

V1 should include:

- scan capture
- local history
- recognition
- pricing enrichment
- local cache
- corrections
- optional account
- basic sync
- one-time Pro
- credits

V1 should not include:

- marketplace listing automation
- business tier
- team workflows
- insurance PDF reports
- photo cloud backup unless specifically approved

## 12. V1.5 Candidates

- CSV export
- collections
- rooms/locations
- listing title/description generation
- additional pricing providers
- price refresh
- richer condition analysis
- manual item entry without photo

## 13. V2 Candidates

- insurance reports
- sale/profit tracking
- reseller workflow
- batch scan mode
- marketplace listing helpers
- barcode/product lookup
- manuals and replacement parts
- recall notices
- object graph / related accessories

## 14. Long-Term Vision

Pricernu becomes a durable knowledge base for physical objects.

The camera is the input. Pricing is the first output. The long-term asset is the user's growing object memory.
