# Task 0011: Staged Results, Identity Picker, Condition

## Goal

Make the scan result screen interactive: show it immediately, fill in identity and price as they arrive, and let the user steer both.

## Why

Capture used to block on recognition and pricing before navigating. The only correction path was a free-text title box.

## Scope

- `createStagedScanFromImage` returns immediately; recognition then pricing run in the background and publish to `subscribeToStagedScan` listeners.
- Per-stage progress (`idle | running | done | failed`) drives the flow card, header, and price card.
- Stale pricing results are dropped when a newer lookup starts (run id guard). Save waits for an in-flight lookup.
- Recognition returns up to two `alternatives`. The result screen shows **Is it one of these?** cards plus **Something else…** with name / brand / model / category fields.
- If on-device recognition fails, the screen stays usable: the user types what the item is and pricing runs from that.
- `InventoryItem.conditionGrade` (`new | used | for_parts`, SQLite migration 4). Condition chips re-price; providers filter by it:
  - eBay `conditionIds` filter
  - Reverb post-filters listing grades
  - PriceCharting uses loose/CIB vs new price, and skips for-parts
- Condition is part of local and server cache keys.
- `buildObjectIdentity` no longer repeats brand/model already present in the name.

## Non-goals

- Comparable listing confirm/reject (next step).
- Buy/sell verdict against an asking price.
- Multi-photo label capture.
