# Pricernu Product Requirements Document

## 1. Summary

Pricernu is a local-first mobile utility for identifying, valuing, and cataloging real-world objects.

The first killer workflow is:

1. Open the app.
2. Scan an object.
3. Identify the object.
4. Estimate its market value.
5. Save the object into a durable local inventory.

The product should feel like a fast native utility, not an AI novelty or subscription trap.

## 2. Product Thesis

Most image-to-price apps are commodity AI wrappers with hostile monetization. Pricernu should win by being useful immediately, private by default, honest about cloud costs, and increasingly valuable as a user's object database grows.

Pricing is the first visible feature. The long-term product is an object intelligence system.

## 3. Primary Jobs To Be Done

### 3.1 Identify

When I see an object, I want to know what it is, including brand, model, category, and likely variant.

### 3.2 Value

When I know what an object is, I want a realistic market value range, not a fake exact number.

### 3.3 Decide

When I am buying, selling, donating, or cataloging an item, I want a recommendation that fits the situation.

Examples:

- Good buy under $40.
- List around $160.
- Donate; resale value is likely too low.
- Add model-label photo for better confidence.

### 3.4 Remember

When I scan something, I want the app to remember it locally so I do not have to repeat the same lookup.

### 3.5 Catalog

When I own something, I want to attach photos, notes, condition, serial/model info, and value history.

## 4. Target Users

### 4.1 Casual Household User

Needs help decluttering, moving, donating, pricing garage sale items, or understanding what household objects are worth.

Expected monetization fit: free local use, one-time Pro, occasional credits.

### 4.2 Marketplace Seller

Sells on Facebook Marketplace, Craigslist, eBay, or similar channels. Needs pricing guidance, listing titles, condition notes, and sale estimates.

Expected monetization fit: Pro plus credits.

### 4.3 Garage Sale / Estate Sale / Thrift Shopper

Needs quick buy/no-buy guidance. The app should be usable while walking through a store or sale.

Expected monetization fit: Pro plus credits if actively scanning.

### 4.4 Reseller / Flipper

Scans many items, tracks cost basis, expected resale, sold price, and profit.

Expected monetization fit: future business tier only after validation.

### 4.5 Inventory / Insurance User

Wants a record of possessions and rough replacement value.

Expected monetization fit: Pro for sync/export/reports.

## 5. MVP Goals

The MVP must prove the scan-identify-price-save loop.

Required:

- Expo React Native app shell
- Camera capture flow
- Local SQLite database
- Local scan history
- Recognition provider abstraction
- Mock recognition provider for early development
- OCR provider abstraction
- Pricing provider abstraction
- Brave Search backed pricing spike through backend action
- Local cache before external lookup
- Item detail screen
- Manual correction flow
- Optional auth architecture documented
- Convex backend architecture documented

## 6. Non-Goals For MVP

Not in MVP:

- full marketplace listing automation
- eBay sold listings integration unless simple and compliant
- Facebook Marketplace scraping
- insurance PDF generation
- business accounts
- team inventory
- barcode-only product database
- desktop app
- browser extension
- price trend charts
- AI chat interface

## 7. Core Flows

### 7.1 First Launch

The user opens the app and can scan immediately.

Acceptance criteria:

- No account wall.
- No subscription prompt.
- Camera or scan action is obvious.
- App can store a local scan.
- User understands cloud enrichment is optional.

### 7.2 Scan Object

The user captures an object photo.

Acceptance criteria:

- Photo is saved locally.
- Scan record is created in SQLite.
- Recognition job runs through provider interface.
- Result screen appears even if recognition is mocked or low confidence.

### 7.3 Identify Object

The app returns object intelligence.

Fields:

- display name
- brand
- model
- category
- variant
- condition notes
- confidence
- explanation
- suggested pricing query

### 7.4 Price Object

The app estimates value.

Lookup order:

1. local price cache
2. local corrected object matches
3. Convex canonical cache when available
4. external pricing enrichment

Acceptance criteria:

- Result uses range, not fake precision.
- Result shows confidence.
- Result shows lookup source: local cache, global cache, or fresh cloud.
- Fresh paid lookup records credit usage.

### 7.5 Correct Result

The user can fix bad recognition.

Correction fields:

- object name
- brand
- model
- category
- condition
- notes

Corrections should improve future local results.

### 7.6 Save Inventory Item

Every scan can become or update an inventory item.

Acceptance criteria:

- Object can have multiple photos.
- Object can have notes.
- Object can retain price snapshots.
- Object can be found later in history.

## 8. Monetization Requirements

### 8.1 Free

- unlimited local scans
- local scan history
- limited lifetime cloud enrichments
- no account required

Recommended initial free allowance: 25 lifetime cloud enrichments.

### 8.2 Pro

One-time purchase.

Unlocks:

- sync
- advanced inventory organization
- export
- future reports
- collections
- included credit bundle

Recommended launch price: $19.99.

### 8.3 Credits

Credits pay for real cloud work.

Cloud enrichment may include:

- Brave Search lookup
- cloud vision fallback
- price refresh
- deeper pricing evidence summarization

Local recognition, local scans, and cached results should not consume credits.

## 9. Trust Requirements

The app must avoid false certainty.

Every priced result should make clear:

- exact model vs similar model
- used vs retail estimate
- lookup date
- confidence
- evidence quality
- whether a credit was consumed

## 10. Privacy Requirements

- Photos remain local by default.
- User explicitly opts into sync or cloud enrichment.
- Cloud work should use minimal necessary data.
- Server API keys never ship to the client.
- User can delete local scans.
- Future account users must be able to delete cloud data.

## 11. Success Metrics

Activation:

- first scan completed
- first result shown
- time to result

Quality:

- correction rate
- recognition confidence vs correction rate
- price result acceptance
- failed lookup rate

Cost:

- cache hit rate
- paid lookup rate per active user
- external API cost per active user

Retention:

- scans per active user
- saved inventory count
- 7-day repeat scans

Monetization:

- free-to-Pro conversion
- credits purchased
- average credits consumed per purchaser
- refund rate

## 12. Open Product Decisions

- final app icon and name presentation
- exact free enrichment allowance
- whether Pro includes 500 or 1000 credits
- how to handle anonymous purchases and later account linking
- whether photo sync is v1 or v1.5
- whether iOS ships in beta or after Android-first validation

## 13. V1 Definition

V1 is successful if a user can scan common household/tool/electronic items, get a plausible identification and value range, correct mistakes, and build a local history without feeling trapped or tricked.
