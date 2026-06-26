# Task 0001: Mobile Foundation

## Goal

Create the first coherent Expo mobile architecture slice without depending on real camera, SQLite, Clerk, Convex, or Brave integrations.

The goal is to prove the app can run a scan workflow through provider interfaces and produce a typed result.

## Scope

Included:

- mobile feature folder structure
- scan workflow service
- mock scan provider wiring
- placeholder app foundation notes

Excluded:

- real Expo generated boilerplate
- camera capture
- SQLite persistence
- Clerk auth
- Convex sync
- Brave Search
- UI polish

## Architecture

The scan feature should depend on provider interfaces from `@pricernu/shared`.

UI components should call a feature service such as `runMockMobileScan`, not individual providers directly.

## Acceptance Criteria

- `runScanWorkflow` accepts a local image URI and provider set.
- OCR, recognition, identity normalization, cache key generation, and pricing run in sequence.
- `runMockMobileScan` wires the mock shared providers.
- Result shape is typed and usable by a future screen.
- No cloud dependency exists in this slice.

## Follow-Up Tasks

- Add actual Expo app package files locally or through a less restrictive write path.
- Add Home screen and Result screen.
- Add local SQLite schema/migrations.
- Add camera capture flow.
