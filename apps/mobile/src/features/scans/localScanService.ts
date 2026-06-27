import type { InventoryItem, PriceEstimate, Scan } from "@pricernu/shared";
import { buildObjectIdentity, mockOcrProvider, mockRecognitionProvider, type OcrResult } from "@pricernu/shared";
import { lookupPriceForInventoryItem } from "@/features/pricing/localPricingService";
import { geminiNanoRecognitionProvider } from "@/features/recognition/geminiNanoRecognitionProvider";
import { pickPhotoFromLibrary } from "@/features/scans/imageCapture";
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
  return createStoredScanFromImageUri({
    imageUri: "mock://local-scan/ryobi-tss103.jpg",
    requestPrefix: "mock-scan-request",
    allowMockPricing: true,
    useMockRecognition: true,
  });
}

export async function importStoredScanFromLibrary(): Promise<StoredScanDetail> {
  const imageUri = await pickPhotoFromLibrary();
  return createStoredScanFromImage(imageUri, "library-scan-request");
}

export async function refreshStoredScanPricing(id: string): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();

  const scan = await localRepositories.scans.getById(id);
  if (!scan?.inventoryItemId) {
    return scan ? { scan, inventoryItem: null, latestPriceEstimate: null } : null;
  }

  const inventoryItem = await localRepositories.inventoryItems.getById(scan.inventoryItemId);
  if (!inventoryItem) {
    return { scan, inventoryItem: null, latestPriceEstimate: null };
  }

  const identity = buildObjectIdentity({
    objectName: inventoryItem.displayName,
    brand: inventoryItem.brand,
    model: inventoryItem.model,
    category: inventoryItem.category,
    variant: inventoryItem.variant,
  });

  const { estimate } = await lookupPriceForInventoryItem({
    inventoryItem,
    identity,
    forceRefresh: true,
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

async function createStoredScanFromImageUri(input: {
  imageUri: string;
  requestPrefix: string;
  allowMockPricing?: boolean;
  useMockRecognition?: boolean;
}): Promise<StoredScanDetail> {
  await initializeLocalStorage();

  const now = new Date();
  const nowIso = now.toISOString();
  const requestId = createLocalId(input.requestPrefix);

  const ocr = await getOcrResult(input.imageUri, requestId, now, input.useMockRecognition === true);
  const recognitionProvider = input.useMockRecognition ? mockRecognitionProvider : geminiNanoRecognitionProvider;
  const recognition = await recognitionProvider.recognize(
    { imageUri: input.imageUri, ocrText: ocr.fullText },
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
    imageUri: input.imageUri,
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
    allowMockFallback: input.allowMockPricing === true,
  });

  return { scan, inventoryItem, latestPriceEstimate: estimate };
}

export async function createStoredScanFromImage(
  imageUri: string,
  requestPrefix = "captured-scan-request",
): Promise<StoredScanDetail> {
  return createStoredScanFromImageUri({ imageUri, requestPrefix });
}

async function getOcrResult(
  imageUri: string,
  requestId: string,
  now: Date,
  useMockRecognition: boolean,
): Promise<OcrResult> {
  if (useMockRecognition) {
    return mockOcrProvider.extractText({ imageUri }, { requestId, now });
  }

  return {
    provider: "none",
    modelCandidates: [],
    serialCandidates: [],
    brandCandidates: [],
  };
}

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
