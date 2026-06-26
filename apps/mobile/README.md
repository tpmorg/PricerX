# Pricernu Mobile

Expo React Native app for the local-first object scanning experience.

The current slice proves the local scan-history loop:

1. Open the app.
2. Create a mock local scan.
3. Persist the scan in SQLite.
4. View the scan in history.
5. Open the scan detail screen.
6. Delete the local scan.

Real camera capture, recognition jobs, Convex sync, Clerk auth, and Brave-backed pricing will be added behind the existing feature/provider boundaries.

## Run

From the repository root:

```sh
npm install
npm run start --workspace @pricernu/mobile
```

Use Expo Go first. A custom native build should not be necessary for this slice.

## Local Storage

SQLite is initialized on first app use through `src/storage/sqliteRepositories.ts`.

The first migration creates:

- `schema_migrations`
- `scans`

The UI talks to `src/features/scans/localScanService.ts`, not SQLite directly.
