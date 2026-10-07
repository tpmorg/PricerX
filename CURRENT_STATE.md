# Current State

*Last updated: 2026-10-07*

## Active Focus
Interactive scan results (tasks 0010, 0011) ahead of cloud vision fallback and the credit ledger.

## Recent Accomplishments
- Task 0010: `lookupPricing` now requires a per-install device id and enforces per-device and global daily limits on fresh lookups; snapshot cache functions are internal-only; `forceRefresh` bypasses the server cache.
- Task 0010: saved photos are copied into the document directory instead of pointing at OS cache files.
- Task 0011: the result screen opens immediately and fills in identity, then price, as each stage finishes.
- Task 0011: "Is it one of these?" candidate cards, a "Something else" name/brand/model/category form (also the fallback when on-device recognition fails), and New/Used/For parts condition chips that filter provider results.
- Added a real Reverb provider path in Convex for music gear pricing lookups.
- Added provider-attempt tracing so pricing responses can explain which providers succeeded, skipped, or failed.
- Tightened Gemini Nano post-processing so `objectName` is a concise item name instead of a whole-scene description.
- Added mobile debug logging for recognition output and pricing lookup/provider results, so live test results show up directly in console logs.
- Reverb lookup is now working on at least one tricky real-world pedal case (`RAT`).
- Refactored capture/library/mock flows to stage results first and write to local SQLite only on explicit Save from the results screen.
- Added first-class local repository/table support for `item_photos`, `recognition_results`, and `ocr_results`.
- Verified workspace typecheck passes with the current staging and persistence changes.
- Added Safe Area handling at the app shell level, plus explicit safe-area screen wrappers for tab and detail surfaces.
- Replaced the old stack-first landing flow with bottom tabs for `Home`, `Account`, and `Settings`, plus a floating center camera action.
- Made `Home` the recent saved captures list so the app opens directly onto the user’s kept items.
- Added an optional staged item-title edit on the results screen so users can tweak the detected name before save or before re-running marketplace search.
- Changed that title edit into a real search-override step: the user-provided exact item title now becomes the marketplace query instead of relying on generic AI category text.
- Restyled the `Home` saved-items list into image-led library cards with overlaid pricing, metadata, and stronger visual hierarchy.
- Flattened the main `Home` library cards into crisp square-edged surfaces so the list reads more like a native mobile feed and less like rounded web cards.
- Changed marketplace pricing to aggregate structured provider results across successful sources instead of stopping at the first strong provider, and updated the mobile UI to label mixed-source pricing as a provider blend rather than a single-source badge.
- Added a first-pass brand system with shared color, type, spacing, and surface tokens plus reusable brand/header/card primitives across the tab surfaces.
- Added a true app theme layer with `ThemeProvider` and `useTheme()`, then migrated the shared shell plus major mobile screens away from scattered raw color values onto semantic theme roles.

## Current Task
Establish a coherent product brand layer before introducing a larger styling framework.

## Next Steps
- Run `npx convex dev` to push the new schema, `rateLimits` module, and cron, and to regenerate `_generated/api.d.ts` (it was edited by hand).
- On device: verify the staged flow (identify → price), candidate switching, condition chips, recognition-failure manual path, and that saved photos survive a cache clear.
- Comparable listings: Same item / Not this, recomputing the range from confirmed matches.
- Cloud vision fallback behind a provider flag, then accounts + credit ledger (reserve → run → settle).
- Validate the new brand system on device for contrast, card density, and tab-bar feel before deciding whether to codify it further with NativeWind.
- Run the app on device/emulator and check the new bottom tab layout, center capture button placement, and safe-area behavior on notched devices.
- Validate the redesigned `Home` cards on device for image crop quality, text legibility, and card-height balance across long item names and different photo types.
- Continue the theme sweep into any remaining component/layout primitives if we want spacing, typography sizing, and button/input variants centralized next.
- Test camera, library, and mock flows to confirm:
  - staged results do not appear in Home before Save
  - Save writes the result and then Home shows it
  - Discard removes the staged result cleanly
  - Refresh pricing behaves sensibly for both staged and saved results
- Decide whether the results screen should allow editing brand/model/category before Save, beyond the new title override.
- Once eBay approval lands, add Browse API credentials and remove `ebay` from the `PRICING_DISABLED_PROVIDERS` Convex env var (set on dev 2026-10-07).
- Consider removing or de-prioritizing PriceCharting if coverage is consistently irrelevant for this app's product mix.

## Known Issues / Blockers
- `expo-gemini-nano` is Android-only today, so no iOS recognition path exists yet.
- Staged results are in-memory only and will be lost if the app fully restarts before Save.
- Items saved before task 0010 still reference OS cache photo paths.
- Device ids are client-generated; the global daily limit is the only hard cost ceiling until auth lands.
- eBay provider work is blocked on developer access/credentials.

## Open Decisions
- Whether staged results should survive app restarts before Save.
- Whether user edits beyond the item title should be applied before the first local save or only after save.
- Keep PriceCharting as a fallback provider or remove it once eBay + Reverb coverage is validated.
- Final provider ordering and gating rules across music gear, general goods, and discovery fallback.
- Image storage strategy (local FS, Convex, or S3).
- Whether the next styling step should be NativeWind after these tokens settle, or a continued lightweight component/token path.
