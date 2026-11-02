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

- Android development build `9cca9a2d-3a95-4b34-8742-829374950f1b` (`versionCode` 9) failed while compiling `expo-gemini-nano` because its ML Kit `FeatureStatus` import used the obsolete package namespace.
- The root postinstall applies the corrected `com.google.mlkit.genai.common.FeatureStatus` import after dependency installation.
- Replacement Android development build `a0a93012-aa44-4d48-b817-8478550d73d0` (`versionCode` 10) was accepted by EAS; completion and on-device validation are pending.
- A newer Android internal development build, `41c4a88e-1b78-400d-a8c7-a645a615a037` (`versionCode` 11), was accepted by EAS on 2026-11-01; completion and on-device validation are pending.
- Android preview build `43422f03-eae9-41d8-975f-acd3b3f93f04` (`versionCode` 12) was then accepted as the requested internal-distribution APK without a development client. The EAS `preview` environment did not inject `EXPO_PUBLIC_CONVEX_URL`.
- Runtime validation exposed that `PricernuFramework.tsx` lived under reserved route directory `src/app`, so Expo Router registered it as a screen without a default export. It now lives under `src/framework`; a replacement internal build is required because versionCode 12 embeds the old route graph.
