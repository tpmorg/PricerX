# Pricernu Mobile

Expo React Native app for the local-first object scanning experience.

The current slice proves the camera-identify-price-save loop in an Android dev
build:

1. Open the app.
2. Capture a camera photo or choose an existing photo.
3. Identify the item locally with Gemini Nano / Android AICore through
   `expo-gemini-nano`.
4. Send the recognized item identity to Convex-backed marketplace search.
5. Persist the scan in SQLite.
6. Create a linked inventory item.
7. Create or reuse a local price estimate.
8. View the scan, item identity, marketplace evidence, and price range in
   history/detail.
9. Delete the local scan and its linked local records.

The `Create Mock Scan` action is now intentionally isolated as a fixture path:
it uses the shared mock recognition and mock pricing providers. Real camera and
library scans do not fall back to the Ryobi saw mock data.

Real scan requirements:

- Android development/native build. Expo Go is not enough because Gemini Nano is
  a native module.
- A device/build where Android AICore reports image description as available.
- `EXPO_PUBLIC_CONVEX_URL` in the mobile environment.
- `BRAVE_SEARCH_API_KEY` in the Convex environment if you want discovery fallback beyond Reverb/eBay.

If Gemini Nano reports `downloadable` or `downloading`, the app asks the module
to warm up and retries status once. If image description is still unavailable,
the scan fails with the actual Gemini state instead of producing mock data.

The legacy mock loop still proves local persistence:

1. Create a mock priced scan.
2. Persist the scan in SQLite.
3. Create a linked inventory item.
4. Create or reuse a local mock price estimate.
5. View the scan, item identity, and price range in history/detail.
6. Delete the local scan and its linked local records.

Convex sync and Clerk auth are still future work behind the existing
feature/provider boundaries.

## Run

From the repository root:

```sh
npm install
npm run start --workspace @pricernu/mobile
```

For the dev-client build lane:

```sh
npm run start:dev --workspace @pricernu/mobile
```

## Environment

Local Expo values live in `.env`, with committed placeholders in
`.env.example`. EAS build profiles are mapped to `development`, `preview`,
and `production` environments in `eas.json`; the root README has the current
EAS variable commands.

## Local Storage

SQLite is initialized on first app use through `src/storage/sqliteRepositories.ts`.

Migrations create:

- `schema_migrations`
- `scans`
- `inventory_items`
- `price_estimates`

The UI talks to feature services:

- `src/features/scans/localScanService.ts`
- `src/features/recognition/geminiNanoRecognitionProvider.ts`
- `src/features/pricing/localPricingService.ts`

Screens do not call SQLite directly.
