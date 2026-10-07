import {
  buildCacheKey,
  buildObjectIdentity,
  buildPricingQuery,
  mockOcrProvider,
  mockPricingProvider,
  mockRecognitionProvider,
  type ObjectIdentity,
  type OcrResult,
  type PricingResult,
  type ProviderContext,
  type RecognitionResult,
} from "@pricernu/shared";

export interface MockScanInput {
  imageUri: string;
  userHint?: string;
}

export interface MockScanResult {
  requestId: string;
  imageUri: string;
  ocr: OcrResult;
  recognition: RecognitionResult;
  identity: ObjectIdentity;
  cacheKey: string;
  pricingQuery: string;
  pricing: PricingResult;
}

export async function runMockScan(input: MockScanInput): Promise<MockScanResult> {
  const context = createProviderContext();

  const ocr = await mockOcrProvider.extractText({ imageUri: input.imageUri }, context);

  const recognition = await mockRecognitionProvider.recognize(
    {
      imageUri: input.imageUri,
      ocrText: ocr.fullText,
      hints: input.userHint ? { userText: input.userHint } : undefined,
    },
    context,
  );

  const identity = buildObjectIdentity({
    objectName: recognition.objectName,
    brand: recognition.brand,
    model: recognition.model,
    category: recognition.category,
    variant: recognition.variant,
  });

  const pricingQuery = recognition.suggestedPricingQuery ?? buildPricingQuery(identity);
  const cacheKey = buildCacheKey(identity);

  const pricing = await mockPricingProvider.lookup(
    {
      identity,
      query: pricingQuery,
    },
    context,
  );

  return {
    requestId: context.requestId,
    imageUri: input.imageUri,
    ocr,
    recognition,
    identity,
    cacheKey,
    pricingQuery,
    pricing,
  };
}

function createProviderContext(): ProviderContext {
  return {
    requestId: `mock-${Date.now()}`,
    now: new Date(),
  };
}
