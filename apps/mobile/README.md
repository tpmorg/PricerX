# Pricernu Mobile

Expo React Native app for the local-first object scanning experience.

The current slice proves the local scan-identify-price-save loop:

1. Open the app.
2. Create a mock priced scan.
3. Persist the scan in SQLite.
4. Create a linked inventory item.
5. Create or reuse a local price estimate.
6. View the scan, item identity, and price range in history/detail.
7. Delete the local scan and its linked local records.

Real camera capture, production recognition jobs, Convex sync, Clerk auth, and Brave-backed pricing UI will be added behind the existing feature/provider boundaries.

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
- `src/features/pricing/localPricingService.ts`

Screens do not call SQLite directly.
