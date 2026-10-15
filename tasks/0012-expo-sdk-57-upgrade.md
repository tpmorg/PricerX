# Task 0012: Expo SDK 57 Upgrade

## Goal

Move the mobile workspace from Expo SDK 56 / React Native 0.85 to Expo SDK 57 / React Native 0.86 on a single, compatible native dependency tree.

## Why

Expo recommends SDK 57 as the supported follow-up to SDK 56. The upgrade also keeps the project compatible with the current Expo Go release and receives the React Native 0.86 fixes shipped in current SDK 57 patches.

## Scope

- Upgrade `expo` and Expo-owned native modules to their SDK 57-compatible versions.
- Upgrade React Native from 0.85.3 to 0.86.3 while retaining React 19.2.3.
- Require Node 22.13 or newer, matching the SDK 57 toolchain floor.
- Regenerate the npm lockfile from the monorepo root so only one Expo/native dependency graph is installed.
- Verify package alignment with Expo Install and Expo Doctor.
- Typecheck every workspace.
- Rebuild and verify the development client separately because `expo-gemini-nano` contains custom Android native code.

## Validation

- `npm run typecheck`
- `npx expo install --check`
- `npx expo-doctor`
- `git diff --check`
- New Android development build, followed by camera, image picker, SQLite persistence, Expo Router navigation, and Gemini Nano recognition checks on device.

## Build Handoff

- Android development build `e68497f0-ab3d-4e07-9720-d7c769540962` was accepted by EAS with `versionCode` 8.
- Build completion and on-device validation are pending.

## Non-goals

- Expo SDK 58 adoption.
- Unrelated dependency or audit remediation.
- Product or visual changes.
