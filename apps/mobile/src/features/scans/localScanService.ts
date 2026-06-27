import type { InventoryItem, PriceEstimate, Scan } from "@pricernu/shared";
import { buildObjectIdentity, mockOcrProvider, mockRecognitionProvider } from "@pricernu/shared";
import { lookupPriceForInventoryItem } from "@/features/pricing/localPricingService";
import { initializeLocalRepositories, localRepositories } from "@/storage/localRepositories";

export interface StoredScanDetail {
  scan: Scan;
  inventoryItem: InventoryItem | null;
  latestPriceEstimate: PriceEstimate | null;
}

export async function initializeLocalStorage(): Promise<void> {
  await initializeLocalRepositories();
}

export async function createMockStoredScan(): Promise<StoredScanDetail> {
  await initializeLocalStorage();

  const now = new Date();
  const nowIso = now.toISOString();
  const requestId = createLocalId("mock-scan-request");
  const imageUri = "mock://local-scan/ryobi-tss103.jpg";

  const ocr = await mockOcrProvider.extractText({ imageUri }, { requestId, now });
  const recognition = await mockRecognitionProvider.recognize(
    { imageUri, ocrText: ocr.fullText },
    { requestId, now },
  );
  const identity = buildObjectIdentity({
    objectName: recognition.objectName,
    brand: recognition.brand,
    model: recognition.model,
    category: recognition.category,
    variant: recognition.variant,
  });

  const inventoryItem: InventoryItem = {
    id: createLocalId("item"),
    displayName: identity.displayName,
    ownershipStatus: "unknown",
    syncStatus: "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    ...(identity.brand ? { brand: identity.brand } : {}),
    ...(identity.model ? { model: identity.model } : {}),
    ...(identity.category ? { category: identity.category } : {}),
    ...(identity.variant ? { variant: identity.variant } : {}),
    ...(recognition.conditionNotes ? { condition: recognition.conditionNotes } : {}),
  };

  const scan: Scan = {
    id: createLocalId("scan"),
    capturedAt: nowIso,
    imageUri,
    inventoryItemId: inventoryItem.id,
    recognitionStatus: "recognized",
    recognitionConfidence: recognition.confidence,
    ocrText: ocr.fullText,
    rawRecognitionJson: JSON.stringify({ recognition, ocr }),
    syncStatus: "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await localRepositories.database.transaction(async () => {
    await localRepositories.inventoryItems.create(inventoryItem);
    await localRepositories.scans.create(scan);
  });

  const { estimate } = await lookupPriceForInventoryItem({
    inventoryItem,
    identity,
    query: recognition.suggestedPricingQuery,
  });

  return { scan, inventoryItem, latestPriceEstimate: estimate };
}

export async function listRecentScans(limit = 25): Promise<Scan[]> {
  await initializeLocalStorage();
  return localRepositories.scans.listRecent(limit);
}

export async function getScanById(id: string): Promise<Scan | null> {
  await initializeLocalStorage();
  return localRepositories.scans.getById(id);
}

export async function getStoredScanDetail(id: string): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();

  const scan = await localRepositories.scans.getById(id);
  if (!scan) return null;

  const inventoryItem = scan.inventoryItemId
    ? await localRepositories.inventoryItems.getById(scan.inventoryItemId)
    : null;
  const latestPriceEstimate = inventoryItem
    ? await localRepositories.priceEstimates.getLatestForInventoryItem(inventoryItem.id)
    : null;

  return { scan, inventoryItem, latestPriceEstimate };
}

export async function deleteScan(id: string): Promise<void> {
  await initializeLocalStorage();

  const scan = await localRepositories.scans.getById(id);
  await localRepositories.database.transaction(async () => {
    if (scan?.inventoryItemId) {
      await localRepositories.priceEstimates.deleteForInventoryItem(scan.inventoryItemId);
      await localRepositories.inventoryItems.delete(scan.inventoryItemId);
    }
    await localRepositories.scans.delete(id);
  });
}

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
