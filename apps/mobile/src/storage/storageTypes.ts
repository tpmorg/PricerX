import type { InventoryItem, ItemPhoto, OcrRecord, PriceEstimate, RecognitionRecord, Scan } from "@pricernu/shared";

export interface LocalDatabase {
  initialize(): Promise<void>;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  reset(): Promise<void>;
}

export interface ScanRepository {
  create(scan: Scan): Promise<void>;
  getById(id: string): Promise<Scan | null>;
  listRecent(limit: number): Promise<Scan[]>;
  update(scan: Scan): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface InventoryItemRepository {
  create(item: InventoryItem): Promise<void>;
  getById(id: string): Promise<InventoryItem | null>;
  listRecent(limit: number): Promise<InventoryItem[]>;
  update(item: InventoryItem): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface PriceEstimateRepository {
  create(estimate: PriceEstimate): Promise<void>;
  getById(id: string): Promise<PriceEstimate | null>;
  listForInventoryItem(inventoryItemId: string): Promise<PriceEstimate[]>;
  getLatestForInventoryItem(inventoryItemId: string): Promise<PriceEstimate | null>;
  findFreshByCacheKey(lookupCacheKey: string, nowIso: string): Promise<PriceEstimate | null>;
  deleteForInventoryItem(inventoryItemId: string): Promise<void>;
}

export interface ItemPhotoRepository {
  create(photo: ItemPhoto): Promise<void>;
  listForInventoryItem(inventoryItemId: string): Promise<ItemPhoto[]>;
  listForScan(scanId: string): Promise<ItemPhoto[]>;
  deleteForInventoryItem(inventoryItemId: string): Promise<void>;
}

export interface RecognitionRecordRepository {
  create(record: RecognitionRecord): Promise<void>;
  listForScan(scanId: string): Promise<RecognitionRecord[]>;
  getLatestForScan(scanId: string): Promise<RecognitionRecord | null>;
  deleteForScan(scanId: string): Promise<void>;
}

export interface OcrRecordRepository {
  create(record: OcrRecord): Promise<void>;
  listForScan(scanId: string): Promise<OcrRecord[]>;
  getLatestForScan(scanId: string): Promise<OcrRecord | null>;
  deleteForScan(scanId: string): Promise<void>;
}

export interface LocalStorageRepositories {
  scans: ScanRepository;
  inventoryItems: InventoryItemRepository;
  priceEstimates: PriceEstimateRepository;
  itemPhotos: ItemPhotoRepository;
  recognitionRecords: RecognitionRecordRepository;
  ocrRecords: OcrRecordRepository;
}
