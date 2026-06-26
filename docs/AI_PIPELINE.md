# Pricernu AI Pipeline

## 1. Goal

The AI pipeline converts a real-world object photo into useful object intelligence:

- identity
- brand
- model
- category
- condition hints
- pricing query
- value evidence
- user-facing recommendation

The pipeline must be provider-driven so Gemini Nano, cloud vision, OCR, and future providers can be swapped without rewriting product logic.

## 2. Pipeline Overview

```txt
Photo capture
  |
  v
Image preprocessing
  |
  +-- OCR extraction
  |
  +-- Object recognition
  |
  v
Identity normalization
  |
  v
Cache lookup
  |
  v
Pricing enrichment if needed
  |
  v
Evidence normalization
  |
  v
User-facing result
  |
  v
Local persistence + optional sync
```

## 3. Recognition Provider

### 3.1 Interface Shape

Input:

- local image URI
- optional OCR text
- optional user hints
- optional prior object matches

Output:

- object name
- brand
- model
- category
- variant
- condition notes
- confidence
- suggested pricing query
- provider name
- raw metadata

### 3.2 Providers

Initial providers:

- `mock`: deterministic fake results for UI and storage development
- `local`: future Gemini Nano or local model integration
- `cloud`: future fallback model

The product should ship the interface before requiring local Gemini Nano to work.

## 4. OCR Provider

OCR should help identify exact models and serial labels.

Inputs:

- object photo
- optional label close-up photo

Outputs:

- full text
- model candidates
- serial candidates
- brand candidates
- confidence
- raw text blocks

Model numbers should be preserved carefully. Do not over-normalize them.

Examples:

- `TSS103`
- `XPH14Z`
- `KSM150PSER`
- `WH-1000XM5`

## 5. Identity Normalization

Recognition output should be normalized into a stable object identity.

Normalized identity fields:

- display name
- normalized name
- brand
- normalized brand
- model
- normalized model
- category
- variant

Rules:

- prefer exact model over generic category
- preserve alphanumeric model tokens
- remove filler words from display query
- retain user correction history
- distinguish exact match from similar item

## 6. Confidence Model

Confidence should combine:

- visual recognition confidence
- OCR confidence
- model-number presence
- brand/model agreement
- pricing result agreement
- prior correction history

Suggested confidence bands:

- 90-100: high confidence exact or near-exact match
- 70-89: likely match, may need model confirmation
- 40-69: rough category/brand match
- 0-39: uncertain; ask for another photo or manual input

## 7. Pricing Query Generation

The recognition pipeline should generate one or more pricing queries.

Good query pattern:

```txt
{brand} {model} {object type} used price
```

Examples:

- `Ryobi TSS103 10 inch sliding miter saw used price`
- `Makita XPH14Z hammer drill used price`
- `KitchenAid KSM150 stand mixer used price`
- `Sony WH-1000XM5 headphones used value`

Avoid generic queries when a model number exists.

## 8. Pricing Enrichment

Pricing enrichment should run only after cache checks.

Provider order:

1. local SQLite cache
2. Convex canonical cache
3. Brave Search backend action
4. future marketplace-specific providers

External lookup should return evidence, not just an answer.

Evidence fields:

- title
- url domain
- snippet
- detected price
- source type
- relevance score
- exact model match boolean
- timestamp

## 9. Evidence Summarization

The app should summarize evidence into a user-facing estimate.

Output:

- low price
- high price
- median price
- suggested list price
- suggested buy price
- retail price if available
- confidence
- evidence summary
- caveats

Avoid false precision. Round reasonably.

Examples:

- `$120-$180`, not `$163.27`
- `Good buy under $90`, not `Buy if under $87.42`

## 10. User-Facing Recommendations

The recommendation layer should translate pricing into action.

Modes:

- value only
- selling
- buying
- inventory/replacement

Examples:

Selling:

> List around $160. Expect faster sale near $130.

Buying:

> Good buy under $90 if complete and working.

Inventory:

> Estimated replacement value around $329; used value likely $120-$180.

## 11. User Corrections

Corrections are training signals.

When a user corrects a result:

- update local object
- record correction
- update local cache key if needed
- prefer corrected identity in future matches
- optionally sync correction to Convex

Do not silently overwrite user-corrected fields with future AI guesses.

## 12. Failure Modes

### 12.1 Low Confidence Recognition

Ask for:

- another photo
- close-up of label/model sticker
- manual brand/model entry

### 12.2 No Pricing Evidence

Return:

- identity result
- no reliable price found
- suggested query refinement
- no misleading value

### 12.3 Conflicting Evidence

Return a wider range and lower confidence.

### 12.4 API Error

Preserve scan locally and mark pricing as deferred.

## 13. Development Strategy

Phase 1:

- mock recognition provider
- local SQLite persistence
- result UI

Phase 2:

- OCR provider stub
- pricing provider stub
- cache key generation

Phase 3:

- Brave Search backend action
- evidence parser
- value range summarizer

Phase 4:

- local Gemini Nano / native provider path
- cloud fallback provider

## 14. Guardrails

- Do not block v1 on perfect local AI.
- Do not make cloud recognition required for the core loop.
- Do not hide low confidence.
- Do not treat web snippets as authoritative truth.
- Do not consume credits for cache hits.
