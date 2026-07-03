export type ISODateTime = string;
export type EntityId = string;

export type SyncStatus =
  | "local_only"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "synced"
  | "conflict"
  | "error";

export type OwnershipStatus =
  | "unknown"
  | "owned"
  | "watching"
  | "for_sale"
  | "sold"
  | "donated"
  | "discarded";

export type RecognitionStatus =
  | "pending"
  | "recognized"
  | "needs_review"
  | "failed";

export type PriceSourceType =
  | "local_cache"
  | "convex_cache"
  | "reverb_listing"
  | "ebay_browse"
  | "pricecharting"
  | "brave_discovery"
  | "mock"
  | "manual"
  | "future_provider";

export interface Scan {
  id: EntityId;
  remoteId?: EntityId;
  capturedAt: ISODateTime;
  imageUri: string;
  thumbnailUri?: string;
  inventoryItemId?: EntityId;
  recognitionStatus: RecognitionStatus;
  recognitionConfidence?: number;
  ocrText?: string;
  rawRecognitionJson?: string;
  syncStatus: SyncStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface InventoryItem {
  id: EntityId;
  remoteId?: EntityId;
  canonicalObjectId?: EntityId;
  displayName: string;
  brand?: string;
  model?: string;
  category?: string;
  variant?: string;
  condition?: string;
  description?: string;
  userNotes?: string;
  ownershipStatus: OwnershipStatus;
  location?: string;
  purchasePrice?: number;
  purchaseDate?: ISODateTime;
  soldPrice?: number;
  soldDate?: ISODateTime;
  syncStatus: SyncStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ObjectIdentity {
  displayName: string;
  normalizedName: string;
  brand?: string;
  normalizedBrand?: string;
  model?: string;
  normalizedModel?: string;
  category?: string;
  variant?: string;
}

export interface RecognitionResult {
  objectName?: string;
  brand?: string;
  model?: string;
  category?: string;
  variant?: string;
  conditionNotes?: string;
  confidence: number;
  suggestedPricingQuery?: string;
  provider: string;
  rawMetadata?: unknown;
}

export interface OcrResult {
  provider: string;
  fullText?: string;
  modelCandidates: string[];
  serialCandidates: string[];
  brandCandidates: string[];
  confidence?: number;
  rawMetadata?: unknown;
}

export interface PriceEstimate {
  id: EntityId;
  remoteId?: EntityId;
  inventoryItemId?: EntityId;
  canonicalObjectId?: EntityId;
  sourceType: PriceSourceType;
  lookupQuery?: string;
  currency: "USD" | string;
  lowPrice?: number;
  highPrice?: number;
  medianPrice?: number;
  suggestedListPrice?: number;
  suggestedBuyPrice?: number;
  retailPrice?: number;
  confidence?: number;
  evidenceSummary?: string;
  rawEvidenceJson?: string;
  lookupCacheKey?: string;
  creditCost: number;
  createdAt: ISODateTime;
  expiresAt?: ISODateTime;
}

export interface PricingEvidenceItem {
  title: string;
  url?: string;
  domain?: string;
  snippet?: string;
  detectedPrice?: number;
  priceText?: string;
  currency?: string;
  sourceType?: string;
  relevanceScore?: number;
  exactModelMatch?: boolean;
  marketplaceType?: string;
  query?: string;
  rank?: number;
  reasons?: string[];
}
