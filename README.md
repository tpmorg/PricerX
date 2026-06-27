# Pricernu

Pricernu is a local-first mobile app for identifying, valuing, and cataloging real-world objects.

The product thesis is simple:

> Most image-to-price apps are dark-pattern subscription wrappers around commodity AI. Pricernu should be fast, local-first, privacy-respecting, and honestly priced.

## Current State

This repository is now a working npm workspace, not just a planning scaffold.

The mobile app runs on Expo SDK 56 with a development-client build lane. The current product slice uses mocked OCR, recognition, and pricing providers to prove the local scan-identify-price-save loop before adding camera capture, auth, sync, or paid provider calls.

Today the app can:

- Create a mocked local scan from the home screen.
- Run mock OCR, recognition, and pricing through shared provider interfaces.
- Persist scans, inventory items, and price estimates in SQLite.
- Reuse local cache keys for pricing estimates.
- View scan history and item detail screens through Expo Router.
- Delete local scans and linked local records.

In progress:

- `expo-image-picker` is installed and native permissions are configured, but real capture/library import is not wired into the scan flow yet.
- `convex` is installed in the mobile app and a Convex Brave pricing provider scaffold exists, but the mobile UI still uses local/mock pricing.

Not implemented yet:

- Real camera/photo capture flow.
- Clerk auth.
- Convex sync from the mobile client.
- Production image recognition.
- Brave-backed pricing in the mobile UI.
- Payment, credits, and entitlement flows.

## Tech Stack

- npm workspaces
- Expo SDK 56 / React Native 0.85
- Expo Router
- Expo development builds through `expo-dev-client` and EAS
- Expo SQLite for local-first persistence
- Convex backend scaffold for server-side pricing actions
- Shared TypeScript domain models, provider interfaces, normalization, and mock providers

Private provider keys should stay server-side. Mobile environment variables must use `EXPO_PUBLIC_*` only when the value is safe to bundle into the app.

## Repository Layout

```txt
apps/mobile       Expo React Native app
backend/convex    Convex backend actions
packages/shared   Shared domain types, provider interfaces, mock providers, normalization
docs              Product, architecture, and decision docs
tasks             Implementation task specs for human and AI agents
```

Key mobile paths:

```txt
apps/mobile/app                         Expo Router screens and layouts
apps/mobile/src/features/scans          Scan workflows and local scan services
apps/mobile/src/features/pricing        Local pricing cache/service logic
apps/mobile/src/storage                 SQLite and in-memory repository implementations
apps/mobile/.env.example                Public mobile env template
apps/mobile/eas.json                    EAS build profiles and environment mapping
```

## Setup

Install dependencies from the repository root:

```sh
npm install
```

Copy or fill the mobile env file:

```sh
cp apps/mobile/.env.example apps/mobile/.env
```

Current mobile client variables:

```sh
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

These values are public once bundled. Do not put `BRAVE_SEARCH_API_KEY`, OpenAI keys, Stripe secret keys, or other private provider credentials in mobile `EXPO_PUBLIC_*` variables.

## Run Mobile

For local Expo development:

```sh
npm run start --workspace @pricernu/mobile
```

The intended native app lane is a development build:

```sh
npm run start:dev --workspace @pricernu/mobile
```

Build a dev client with EAS from `apps/mobile`:

```sh
npx eas build -p ios --profile development
npx eas build -p android --profile development
```

## EAS Environments

`apps/mobile/eas.json` maps build profiles to EAS environments:

- `development` -> EAS `development`
- `preview` -> EAS `preview`
- `production` -> EAS `production`

Create public client variables in EAS with:

```sh
npm run env:create --workspace @pricernu/mobile -- --name EXPO_PUBLIC_CONVEX_URL --value your_value --environment development --visibility plaintext
```

That writes to Expo/EAS cloud storage, not the local `.env` file. Local `.env` supports local Metro/Expo commands; EAS env values support cloud builds.

Useful checks:

```sh
npm run env:list:development --workspace @pricernu/mobile
npm run env:pull:development --workspace @pricernu/mobile
```

## Convex Backend

The Convex package currently contains a server-side Brave Search pricing action spike:

```sh
npm run dev --workspace @pricernu/convex
```

Set private provider keys in Convex, not in the mobile app:

```sh
npx convex env set BRAVE_SEARCH_API_KEY your_key_here
```

`backend/convex/convex/pricing.ts` exposes `lookupPricing`, which returns typed success/failure results and keeps paid API use behind the backend boundary.

## Verification

Run TypeScript checks across workspaces:

```sh
npm run typecheck
```

Current note: the full workspace typecheck is red while the in-progress mobile
Convex pricing provider and shared optional-property typing are being wired up.
Use this command as the target verification check before merging the current
integration work.

Run Expo diagnostics from the mobile app directory:

```sh
cd apps/mobile
npx expo-doctor
```

## Product Direction

Start with:

- `docs/CONSTITUTION.md`
- `docs/PRD.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`

The guiding principles remain:

- Local first.
- No account required for first value.
- Cache before paid API calls.
- Server-side secrets only.
- AI supports the workflow; it is not the product.
