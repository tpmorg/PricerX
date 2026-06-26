import type { OcrProvider, PricingProvider, RecognitionProvider } from "./providers";
import { buildObjectIdentity, buildPricingQuery } from "./normalize";

export const mockRecognitionProvider: RecognitionProvider = {
  id: "mock-recognition",
  label: "Mock Recognition",
  async recognize(input, context) {
    const objectName = input.hints?.userText || "Ryobi 10 inch sliding miter saw";
    const brand = input.hints?.brand || "Ryobi";
    const model = input.hints?.model || "TSS103";
    const category = input.hints?.category || "miter saw";
    const identity = buildObjectIdentity({ objectName, brand, model, category });

    return {
      objectName,
      brand,
      model,
      category,
      conditionNotes: "Mock result for app scaffolding.",
      confidence: 0.91,
      suggestedPricingQuery: buildPricingQuery(identity),
      provider: mockRecognitionProvider.id,
      rawMetadata: {
        requestId: context.requestId,
        imageUri: input.imageUri,
        mocked: true,
      },
    };
  },
};

export const mockOcrProvider: OcrProvider = {
  id: "mock-ocr",
  label: "Mock OCR",
  async extractText(input, context) {
    return {
      provider: mockOcrProvider.id,
      fullText: "RYOBI TSS103 10 IN SLIDING MITER SAW",
      modelCandidates: ["TSS103"],
      serialCandidates: [],
      brandCandidates: ["RYOBI"],
      confidence: 0.88,
      rawMetadata: {
        requestId: context.requestId,
        imageUri: input.imageUri,
        mocked: true,
      },
    };
  },
};

export const mockPricingProvider: PricingProvider = {
  id: "mock-pricing",
  label: "Mock Pricing",
  async lookup(input, context) {
    return {
      estimate: {
        sourceType: "manual",
        lookupQuery: input.query,
        currency: "USD",
        lowPrice: 120,
        highPrice: 180,
        medianPrice: 150,
        suggestedListPrice: 160,
        suggestedBuyPrice: 90,
        retailPrice: 329,
        confidence: 0.74,
        evidenceSummary: "Mock estimate for development. Replace with Brave-backed enrichment.",
        rawEvidenceJson: JSON.stringify({ requestId: context.requestId, mocked: true }),
        creditCost: 0,
      },
      evidence: [
        {
          title: "Mock marketplace comparable",
          domain: "example.local",
          snippet: "Used Ryobi TSS103 saws commonly appear in the low-to-mid hundreds.",
          detectedPrice: 150,
          currency: "USD",
          sourceType: "mock",
          relevanceScore: 0.8,
          exactModelMatch: true,
        },
      ],
    };
  },
};
