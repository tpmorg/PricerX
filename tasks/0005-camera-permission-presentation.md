# Task 0005: Camera Permission Presentation

## Goal

Make the camera permission flow feel trustworthy, understandable, and recoverable before users enter the core scan-to-price experience.

## Context

The Android development build now has a working camera. The current permission presentation is functional but too bare. Because camera access is the first sensitive permission in the app, the app should explain why the permission matters, what happens after granting it, and what to do when permission is denied or blocked.

This task should improve presentation only. Do not distract from the next Brave Search integration test.

## Requirements

- Replace the generic full-screen permission message with a polished pre-permission screen.
- Explain the benefit in user terms: capture an item photo so Pricernu can identify it and find pricing evidence.
- Use calm, direct copy without sounding like a legal notice.
- Show a clear primary action to grant camera access.
- Provide a secondary path back to the previous screen.
- Handle denied permission with a useful retry state.
- Handle blocked/unavailable permission with a way to open system settings when supported.
- Preserve the successful camera capture flow.
- Keep the UI consistent with the rest of the mobile app.

## Acceptance Criteria

- First-time camera users see app-level context before or alongside the native permission request.
- If permission is granted, the camera opens normally.
- If permission is denied, the app explains that camera access is needed and offers a clear retry.
- If permission cannot be requested again, the app points users toward system settings.
- The screen does not trap the user; Back/Close remains available.
- Text does not overlap or clip on small Android screens.
- `npm run typecheck` passes.

## Non-Goals

- Auth or account setup.
- Remote storage.
- Brave Search changes.
- LLM recognition changes.
- A full visual redesign of the camera capture screen.

## Notes For AI Agents

Treat this as trust-building UX, not decoration. The permission screen should answer: why camera, why now, what happens next, and how do I leave?
