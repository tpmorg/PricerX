import type { InventoryItem, PriceEstimate, Scan } from "@pricernu/shared";
import type {
  InventoryItemRepository,
  LocalDatabase,
  LocalStorageRepositories,
  PriceEstimateRepository,
  ScanRepository,
} from "./storageTypes";

export class InMemoryLocalDatabase implements LocalDatabase {
  async initialize(): Promise<void> {
    return;
  }

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
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

export function createInMemoryRepositories(): LocalStorageRepositories {
  return {
    scans: new InMemoryScanRepository(),
    inventoryItems: new InMemoryInventoryItemRepository(),
    priceEstimates: new InMemoryPriceEstimateRepository(),
  };
}
