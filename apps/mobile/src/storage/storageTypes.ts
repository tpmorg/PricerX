import type { InventoryItem, PriceEstimate, Scan } from "@pricernu/shared";

export interface LocalDatabase {
  initialize(): Promise<void>;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
}

export interface ScanRepository {
  create(scan: Scan): Promise<void>;
  getById(id: string): Promise<Scan | null>;
  listRecent(limit: number): Promise<Scan[]>;
  update(scan: Scan): Promise<void>;
}

export interface InventoryItemRepository {
  create(item: InventoryItem): Promise<void>;
  getById(id: string): Promise<InventoryItem | null>;
  listRecent(limit: number): Promise<InventoryItem[]>;
  update(item: InventoryItem): Promise<void>;
}

export interface PriceEstimateRepository {
  create(estimate: PriceEstimate): Promise<void>;
  listForInventoryItem(inventoryItemId: string): Promise<PriceEstimate[]>;
  getLatestForInventoryItem(inventoryItemId: string): Promise<PriceEstimate | null>;
}

export interface LocalStorageRepositories {
  scans: ScanRepository;
  inventoryItems: InventoryItemRepository;
  priceEstimates: PriceEstimateRepository;
}
