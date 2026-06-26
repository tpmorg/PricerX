# Task 0003: Recognition Provider Stub

## Goal

Create the recognition provider interface and a deterministic mock provider.

## Context

The app should not hard-code Gemini Nano, cloud vision, or any specific recognition provider. The first implementation should use a mock provider so UI, persistence, and correction flows can be built before final AI decisions.

## Requirements

- Define `RecognitionProvider` interface.
- Define recognition input and output types.
- Implement `MockRecognitionProvider`.
- Add a simple service function that runs recognition for a scan.
- Persist recognition result to local SQLite if `recognition_results` table exists, or update `scans.raw_recognition_json` as a temporary step.
- Update scan detail UI to show mock result.

## Suggested Output Type

```ts
export type RecognitionResult = {
  objectName: string;
  brand?: string;
  model?: string;
  category?: string;
  variant?: string;
  conditionNotes?: string;
  confidence: number;
  suggestedPricingQuery?: string;
  provider: string;
  raw?: unknown;
};
```

## Mock Behavior

For now, return a stable fake object such as:

- object: Ryobi 10-inch sliding miter saw
- brand: Ryobi
- model: TSS103
- category: tool
- confidence: 0.92
- query: Ryobi TSS103 10 inch sliding miter saw used price

## Acceptance Criteria

- Recognition provider interface exists.
- Mock provider can be invoked from app code.
- Result appears on scan detail screen.
- Recognition result persists locally or is attached to scan record.
- No network call occurs.

## Non-Goals

- real Gemini Nano integration
- OCR
- Brave Search
- pricing estimates
- cloud fallback

## Notes For AI Agents

Keep this extremely small. The point is to define seams, not to build the real AI stack yet.
