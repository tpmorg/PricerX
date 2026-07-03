import type { InventoryItem, ItemPhoto, OcrRecord, PriceEstimate, RecognitionRecord, Scan } from "@pricernu/shared";
import type {
  InventoryItemRepository,
  ItemPhotoRepository,
  LocalDatabase,
  LocalStorageRepositories,
  OcrRecordRepository,
  PriceEstimateRepository,
  RecognitionRecordRepository,
  ScanRepository,
} from "./storageTypes";

export class InMemoryLocalDatabase implements LocalDatabase {
  async initialize(): Promise<void> {
    return;
  }

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }

  async reset(): Promise<void> {
    return;
  }
}

export class InMemoryScanRepository implements ScanRepository {
  private readonly scans = new Map<string, Scan>();

  async create(scan: Scan): Promise<void> {
    this.scans.set(scan.id, scan);
  }

  async getById(id: string): Promise<Scan | null> {
    return this.scans.get(id) ?? null;
  }

  async listRecent(limit: number): Promise<Scan[]> {
    return [...this.scans.values()]
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .slice(0, limit);
  }

  async update(scan: Scan): Promise<void> {
    this.scans.set(scan.id, scan);
  }

  async delete(id: string): Promise<void> {
    this.scans.delete(id);
  }
}

export class InMemoryInventoryItemRepository implements InventoryItemRepository {
  private readonly items = new Map<string, InventoryItem>();

  async create(item: InventoryItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async getById(id: string): Promise<InventoryItem | null> {
    return this.items.get(id) ?? null;
  }

  async listRecent(limit: number): Promise<InventoryItem[]> {
    return [...this.items.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async update(item: InventoryItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}

export class InMemoryPriceEstimateRepository implements PriceEstimateRepository {
  private readonly estimates = new Map<string, PriceEstimate>();

  async create(estimate: PriceEstimate): Promise<void> {
    this.estimates.set(estimate.id, estimate);
  }

  async getById(id: string): Promise<PriceEstimate | null> {
    return this.estimates.get(id) ?? null;
  }

  async listForInventoryItem(inventoryItemId: string): Promise<PriceEstimate[]> {
    return [...this.estimates.values()]
      .filter((estimate) => estimate.inventoryItemId === inventoryItemId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getLatestForInventoryItem(inventoryItemId: string): Promise<PriceEstimate | null> {
    return (await this.listForInventoryItem(inventoryItemId))[0] ?? null;
  }

  async findFreshByCacheKey(lookupCacheKey: string, nowIso: string): Promise<PriceEstimate | null> {
    return [...this.estimates.values()]
      .filter(
        (estimate) =>
          estimate.lookupCacheKey === lookupCacheKey &&
          (!estimate.expiresAt || estimate.expiresAt > nowIso),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }

  async deleteForInventoryItem(inventoryItemId: string): Promise<void> {
    for (const estimate of this.estimates.values()) {
      if (estimate.inventoryItemId === inventoryItemId) {
        this.estimates.delete(estimate.id);
      }
    }
  }
}

export class InMemoryItemPhotoRepository implements ItemPhotoRepository {
  private readonly photos = new Map<string, ItemPhoto>();

  async create(photo: ItemPhoto): Promise<void> {
    this.photos.set(photo.id, photo);
  }

  async listForInventoryItem(inventoryItemId: string): Promise<ItemPhoto[]> {
    return [...this.photos.values()]
      .filter((photo) => photo.inventoryItemId === inventoryItemId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listForScan(scanId: string): Promise<ItemPhoto[]> {
    return [...this.photos.values()]
      .filter((photo) => photo.scanId === scanId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async deleteForInventoryItem(inventoryItemId: string): Promise<void> {
    for (const photo of this.photos.values()) {
      if (photo.inventoryItemId === inventoryItemId) {
        this.photos.delete(photo.id);
      }
    }
  }
}

export class InMemoryRecognitionRecordRepository implements RecognitionRecordRepository {
  private readonly records = new Map<string, RecognitionRecord>();

  async create(record: RecognitionRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async listForScan(scanId: string): Promise<RecognitionRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.scanId === scanId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getLatestForScan(scanId: string): Promise<RecognitionRecord | null> {
    return (await this.listForScan(scanId))[0] ?? null;
  }

  async deleteForScan(scanId: string): Promise<void> {
    for (const record of this.records.values()) {
      if (record.scanId === scanId) {
        this.records.delete(record.id);
      }
    }
  }
}

export class InMemoryOcrRecordRepository implements OcrRecordRepository {
  private readonly records = new Map<string, OcrRecord>();

  async create(record: OcrRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async listForScan(scanId: string): Promise<OcrRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.scanId === scanId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getLatestForScan(scanId: string): Promise<OcrRecord | null> {
    return (await this.listForScan(scanId))[0] ?? null;
  }

  async deleteForScan(scanId: string): Promise<void> {
    for (const record of this.records.values()) {
      if (record.scanId === scanId) {
        this.records.delete(record.id);
      }
    }
  }
}

export function createInMemoryRepositories(): LocalStorageRepositories {
  return {
    scans: new InMemoryScanRepository(),
    inventoryItems: new InMemoryInventoryItemRepository(),
    priceEstimates: new InMemoryPriceEstimateRepository(),
    itemPhotos: new InMemoryItemPhotoRepository(),
    recognitionRecords: new InMemoryRecognitionRecordRepository(),
    ocrRecords: new InMemoryOcrRecordRepository(),
  };
}
