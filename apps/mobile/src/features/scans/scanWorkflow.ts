import {
  buildCacheKey,
  buildObjectIdentity,
  buildPricingQuery,
  type ObjectIdentity,
  type OcrProvider,
  type OcrResult,
  type PricingProvider,
  type PricingResult,
  type ProviderContext,
  type RecognitionProvider,
  type RecognitionResult,
} from "@pricernu/shared";

export interface ScanWorkflowInput {
  imageUri: string;
  userHint?: string;
}

export interface ScanWorkflowProviders {
  ocr: OcrProvider;
  recognition: RecognitionProvider;
  pricing: PricingProvider;
}

export interface ScanWorkflowResult {
  requestId: string;
  imageUri: string;
  ocr: OcrResult;
  recognition: RecognitionResult;
  identity: ObjectIdentity;
  cacheKey: string;
  pricingQuery: string;
  pricing: PricingResult;
}

export async function runScanWorkflow(
  input: ScanWorkflowInput,
  providers: ScanWorkflowProviders,
): Promise<ScanWorkflowResult> {
  const context = createProviderContext();
  const ocr = await providers.ocr.extractText({ imageUri: input.imageUri }, context);
  const recognition = await providers.recognition.recognize(
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
  const pricing = await providers.pricing.lookup(
    {
      identity,
      query: pricingQuery,
      condition: recognition.conditionNotes,
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
    requestId: `scan-${Date.now()}`,
    now: new Date(),
  };
}
