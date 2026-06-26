# Pricernu Monetization

## 1. Monetization Thesis

Pricernu should reject the dark-pattern scanner-app model.

The app should not feel like:

> Three scans, then $9.99/week.

It should feel like:

> Buy the app once. Local use is yours. Cloud AI and search cost money, so heavy cloud use is credit-based.

## 2. Principles

- No weekly subscription traps.
- No fake free trial.
- No account required before first value.
- Local work should not consume credits.
- Cached results should not consume credits.
- Users should understand what costs money.
- Pro should unlock ownership features, not hide the core aha moment.

## 3. Free Tier

Free should demonstrate the product.

Includes:

- unlimited local scans
- local scan history
- local item editing
- local cache
- limited lifetime cloud enrichments
- no required account

Recommended initial allowance:

- 25 lifetime cloud enrichments

Avoid daily free resets because they train users to wait instead of buy.

## 4. Pro One-Time Purchase

Recommended launch price:

- $19.99

Possible price tests:

- $14.99 launch promo
- $24.99 mature utility price

Pro unlocks:

- cloud sync
- multi-device restore
- inventory organization
- collections
- CSV export
- future reports
- advanced search/filtering
- included cloud credit bundle

Recommended included credits:

- 1000 cloud enrichments

## 5. Credit Packs

Credits pay for real cloud work.

Suggested packs:

- 500 credits: $4.99
- 2500 credits: $14.99
- 10000 credits: $39.99

Name credits as `cloud enrichments` in user-facing copy where possible.

## 6. What Consumes Credits

Consumes credits:

- fresh Brave Search lookup
- cloud vision fallback
- explicit price refresh when stale and not cacheable
- future deeper marketplace enrichment

Does not consume credits:

- local scan capture
- local recognition
- local OCR
- local history browsing
- local cache hit
- Convex global cache hit if no paid work occurs
- manual edits
- failed lookup with no useful paid result

## 7. Server-Side Ledger

Credits must be authoritative server-side.

Convex should track:

- initial free grant
- Pro purchase grant
- credit pack purchase
- cloud enrichment debit
- refund/adjustment

The client may cache a displayed balance, but should not be trusted as source of truth.

## 8. Anonymous Use

Anonymous users should be allowed to try the app.

Open decision:

- how to prevent abuse of anonymous free credits

Options:

- device-local free allowance only
- server-issued anonymous device token
- require sign-in before cloud enrichment after small local-only demo

Default recommendation:

- local-only use does not require identity
- cloud enrichment after initial tiny allowance should require account or purchase

## 9. Business Tier Later

Do not launch with subscription.

A subscription may become justified only if reseller usage appears.

Possible future business tier:

- $9.99/month or $49.99/year
- higher included credits
- batch scan mode
- profit tracking
- sales channel exports
- team/shared inventory
- advanced reporting

This should be validated, not assumed.

## 10. App Store Copy Direction

Possible positioning:

> No weekly subscription. No scan traps. Pricernu runs locally first and only uses paid cloud enrichment when you ask for deeper pricing evidence.

Core bullets:

- Identify real-world objects
- Estimate realistic value ranges
- Build a private local inventory
- Buy once for Pro features
- Use credits only for cloud enrichment

## 11. Metrics To Watch

- free cloud enrichment burn rate
- cache hit rate
- Pro conversion
- credit purchase conversion
- credits consumed per retained user
- external API cost per active user
- refund rate
- reviews mentioning pricing fairness

## 12. Pricing Risks

### Too Generous Free Tier

Could burn API cost without conversion.

Mitigation:

- lifetime credits, not daily credits
- cache-first design
- server-side rate limiting

### Too Stingy Free Tier

Could hide the aha moment.

Mitigation:

- enough free enrichments to experience value
- clear explanation of local vs cloud

### Confusing Pro + Credits

Users may think one-time Pro should include everything forever.

Mitigation:

- Pro includes generous credits
- explain that local features are permanent
- explain cloud enrichment has real cost

## 13. Default Launch Model

- Free: unlimited local use + 25 lifetime enrichments
- Pro: $19.99 one-time + 1000 enrichments
- Credit packs: 500 / 2500 / 10000
- No subscription at launch
