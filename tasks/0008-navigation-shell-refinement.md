# Task 0008 – Navigation Shell Refinement

## Goal
Refine the mobile shell so capture feels native and persistent work is easier to revisit.

## Scope
- Wrap the app in Safe Area handling so content does not collide with device chrome.
- Replace the simple stack-first landing flow with bottom tabs for `Home`, `Account`, and `Settings`.
- Make `Home` the recent saved captures list.
- Add a floating center camera action above the tab bar for fast capture access.

## Notes
- Keep camera and item detail outside the tab stack so they can remain focused flows.
- Preserve the explicit-save behavior that keeps unsaved staged results out of the recent list.
