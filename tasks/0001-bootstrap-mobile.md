# Task 0001: Bootstrap Mobile App

## Goal

Create the initial Expo React Native app shell for Pricernu.

## Context

The project is local-first. The mobile app should eventually own camera capture, SQLite persistence, recognition provider calls, and scan history.

This task should create the app skeleton only. Do not implement recognition, auth, Convex, or payments yet.

## Target Structure

```txt
/apps/mobile
  app or src
  package.json
  tsconfig.json
  README.md
```

Use the current Expo best-practice app structure at implementation time.

## Requirements

- Create Expo React Native app under `apps/mobile`.
- Use TypeScript.
- Add basic screens or routes:
  - Scan
  - History
  - Item Detail placeholder
  - Settings placeholder
- Add a simple app name: `Pricernu`.
- Keep UI plain and functional.
- Avoid premature styling systems.
- Add a mobile README explaining how to run the app.

## Acceptance Criteria

- App starts locally with Expo.
- TypeScript compiles.
- Navigation between placeholder screens works.
- No auth required.
- No backend required.
- No paid API required.

## Non-Goals

- Camera capture
- SQLite schema
- Clerk auth
- Convex backend
- Brave Search
- Gemini Nano
- payments

## Notes For AI Agents

Prefer boring defaults. Do not introduce a design system, state machine library, or external data layer in this task.
