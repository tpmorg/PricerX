# Task 0007: Save-Gated Local Persistence

## Goal

Keep capture, recognition, and marketplace lookup fast and explorable, but do not persist anything to local SQLite until the user explicitly taps **Save** on the results screen.

## Why

The current auto-save flow makes every camera or library attempt durable before the user has decided the result is worth keeping. That pollutes local history and conflates "analysis happened" with "user accepted this result."

## First-pass scope

- Stage scan results in memory after capture/library/mock input.
- Allow the results screen to show:
  - photo
  - recognized identity
  - latest pricing result
  - provider evidence
- Persist to SQLite only when the user taps Save.
- Persist the first-class local records needed for later refinement:
  - `scans`
  - `inventory_items`
  - `price_estimates`
  - `item_photos`
  - `recognition_results`
  - `ocr_results`

## Non-goals for this pass

- Surviving app restarts before Save
- Multi-photo sessions
- Edit/review UI for recognition fields before Save
- Background sync

## Notes

- Staged results may live in memory only for now.
- Stable local IDs can still be created during staging, then written unchanged on Save.
- History should show only saved scans.
