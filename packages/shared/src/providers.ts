import type {
  ObjectIdentity,
  OcrResult,
  PriceEstimate,
  PricingEvidenceItem,
  RecognitionResult,
} from "./domain";

export interface ProviderContext {
  requestId: string;
  now: Date;
}

export interface RecognitionInput {
  imageUri: string;
  ocrText?: string;
  hints?: {
    brand?: string;
    model?: string;
    category?: string;
    userText?: string;
  };
}

export interface RecognitionProvider {
  readonly id: string;
  readonly label: string;
  recognize(input: RecognitionInput, context: ProviderContext): Promise<RecognitionResult>;
}

export interface OcrInput {
  imageUri: string;
}

export interface OcrProvider {
  readonly id: string;
  readonly label: string;
  extractText(input: OcrInput, context: ProviderContext): Promise<OcrResult>;
}

export interface PricingInput {
  identity: ObjectIdentity;
  query: string;
  condition?: string;
}

export interface PricingResult {
  estimate: Omit<PriceEstimate, "id" | "createdAt">;
  evidence: PricingEvidenceItem[];
}

export interface PricingProvider {
  readonly id: string;
  readonly label: string;
  lookup(input: PricingInput, context: ProviderContext): Promise<PricingResult>;
}

export interface CacheLookupInput {
  identity: ObjectIdentity;
  query?: string;
}

export interface CacheProvider<TValue> {
  get(input: CacheLookupInput): Promise<TValue | null>;
  set(input: CacheLookupInput, value: TValue): Promise<void>;
}
