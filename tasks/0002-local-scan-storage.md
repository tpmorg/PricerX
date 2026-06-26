# Task 0002: Local Scan Storage

## Goal

Add SQLite-backed local storage for scans.

## Context

Pricernu is local-first. Before recognition, cloud sync, or pricing, the app must be able to store a scan record locally and read it back.

## Requirements

- Add SQLite dependency appropriate for Expo.
- Add explicit schema migration support.
- Create initial tables:
  - `schema_migrations`
  - `scans`
- Implement a small local repository module for scans.
- Add functions:
  - create scan
  - list scans
  - get scan by ID
  - delete scan
- Add basic error handling.
- Add a developer-only seed or debug action if useful.

## Initial `scans` Fields

- `id`
- `captured_at`
- `image_uri`
- `thumbnail_uri`
- `recognition_status`
- `recognition_confidence`
- `ocr_text`
- `raw_recognition_json`
- `sync_status`
- `created_at`
- `updated_at`

## Acceptance Criteria

- App initializes SQLite database on startup.
- Migration runs once and is recorded.
- A scan row can be inserted and listed.
- History screen can render stored scan rows.
- Data persists across app reloads.

## Non-Goals

- Camera capture
- real image files
- recognition provider
- cloud sync
- Convex
- auth

## Notes For AI Agents

Do not abstract the database heavily. A small explicit module is preferred over clever generalized persistence.
