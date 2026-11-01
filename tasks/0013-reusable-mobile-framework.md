# Task 0013: Apply Reusable Mobile Framework

## Goal

Adopt the product-neutral infrastructure from `tpmorg/react-expo-starter` without replacing Pricernu's product routes, theme, local scan domain, Convex pricing, or Gemini Nano integration.

## Scope

- Import the reusable framework, optional generation module, test kit, and storage regression scripts.
- Mount configuration, error, framework database, network, and guest-auth lifecycle providers around Expo Router.
- Gate product routes on Pricernu's existing SQLite repository initialization.
- Keep framework infrastructure in `pricernu-framework.db` so its string migration ledger cannot collide with the existing numeric migration ledger in `pricernu.db`.
- Add optional configuration seams for Sentry, RevenueCat, Firebase adapters, Apple/Google identity adapters, and notifications without enabling those services.
- Preserve Pricernu's existing theme and navigation hierarchy.

## Non-goals

- Replacing Clerk as the preferred future identity direction with Firebase.
- Enabling billing, notifications, Sentry, remote job endpoints, or cloud sync.
- Migrating existing product tables into the framework database.
- Changing product screens or visual design.
- Producing a store release build.

## Validation

- `npm run typecheck`
- `npm test`
- `npm run test:storage`
- `npx expo install --check`
- `npx expo-doctor`
- `git diff --check`

Static and Node-based checks do not prove Expo SQLite, native adapters, or Gemini Nano on a device. Because new native dependencies are added, a fresh development build is required before device verification.

## Build Handoff

- Android development build `9cca9a2d-3a95-4b34-8742-829374950f1b` was accepted by EAS with `versionCode` 9.
- Build completion and on-device validation are pending.
