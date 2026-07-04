import type { InventoryItem, ItemPhoto, OcrRecord, PriceEstimate, RecognitionRecord, Scan } from "@pricernu/shared";
import { buildObjectIdentity, mockOcrProvider, mockRecognitionProvider, type OcrResult } from "@pricernu/shared";
import { lookupPriceForInventoryItem } from "@/features/pricing/localPricingService";
import { geminiNanoRecognitionProvider } from "@/features/recognition/geminiNanoRecognitionProvider";
import { pickPhotoFromLibrary } from "@/features/scans/imageCapture";
import { initializeLocalRepositories, localRepositories } from "@/storage/localRepositories";

export interface StoredScanDetail {
  scan: Scan;
  inventoryItem: InventoryItem | null;
  latestPriceEstimate: PriceEstimate | null;
  itemPhotos: ItemPhoto[];
  recognitionRecords: RecognitionRecord[];
  ocrRecords: OcrRecord[];
  isSaved: boolean;
}

export interface SavedItemSummary {
  inventoryItem: InventoryItem;
  latestPriceEstimate: PriceEstimate | null;
  primaryPhoto: ItemPhoto | null;
  latestScan: Scan | null;
}

interface StagedScanBundle {
  detail: StoredScanDetail;
}

const stagedScans = new Map<string, StagedScanBundle>();

export async function initializeLocalStorage(): Promise<void> {
  await initializeLocalRepositories();
}

export async function createMockStoredScan(): Promise<StoredScanDetail> {
  return createStagedScanFromImageUri({
    imageUri: "mock://local-scan/ryobi-tss103.jpg",
    requestPrefix: "mock-scan-request",
    allowMockPricing: true,
    useMockRecognition: true,
  });
}

export async function importStoredScanFromLibrary(): Promise<StoredScanDetail> {
  const imageUri = await pickPhotoFromLibrary();
  return createStagedScanFromImage(imageUri, "library-scan-request");
}

export async function refreshStoredScanPricing(
  id: string,
  input?: { query?: string },
): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();
  const manualQuery = input?.query?.trim();

  const staged = stagedScans.get(id);
  if (staged) {
    const inventoryItem = staged.detail.inventoryItem;
    if (!inventoryItem) return staged.detail;

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
      ...(manualQuery ? { query: manualQuery } : {}),
      forceRefresh: true,
      persistResult: false,
    });

    const nextDetail = {
      ...staged.detail,
      latestPriceEstimate: estimate,
    } satisfies StoredScanDetail;
    stagedScans.set(id, { detail: nextDetail });
    return nextDetail;
  }

  const scan = await localRepositories.scans.getById(id);
  if (!scan?.inventoryItemId) {
    if (!scan) return null;
    return {
      scan,
      inventoryItem: null,
      latestPriceEstimate: null,
      itemPhotos: [],
      recognitionRecords: await localRepositories.recognitionRecords.listForScan(scan.id),
      ocrRecords: await localRepositories.ocrRecords.listForScan(scan.id),
      isSaved: true,
    };
  }

  const inventoryItem = await localRepositories.inventoryItems.getById(scan.inventoryItemId);
  if (!inventoryItem) {
    return {
      scan,
      inventoryItem: null,
      latestPriceEstimate: null,
      itemPhotos: [],
      recognitionRecords: await localRepositories.recognitionRecords.listForScan(scan.id),
      ocrRecords: await localRepositories.ocrRecords.listForScan(scan.id),
      isSaved: true,
    };
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
    ...(manualQuery ? { query: manualQuery } : {}),
    forceRefresh: true,
  });

  return {
    scan,
    inventoryItem,
    latestPriceEstimate: estimate,
    itemPhotos: await localRepositories.itemPhotos.listForInventoryItem(inventoryItem.id),
    recognitionRecords: await localRepositories.recognitionRecords.listForScan(scan.id),
    ocrRecords: await localRepositories.ocrRecords.listForScan(scan.id),
    isSaved: true,
  };
}

export async function listRecentScans(limit = 25): Promise<Scan[]> {
  await initializeLocalStorage();
  return localRepositories.scans.listRecent(limit);
}

export async function listSavedItems(limit = 25): Promise<SavedItemSummary[]> {
  await initializeLocalStorage();

  const [items, scans] = await Promise.all([
    localRepositories.inventoryItems.listRecent(limit),
    localRepositories.scans.listRecent(Math.max(limit * 4, 100)),
  ]);

  return Promise.all(
    items.map(async (inventoryItem) => {
      const [latestPriceEstimate, photos] = await Promise.all([
        localRepositories.priceEstimates.getLatestForInventoryItem(inventoryItem.id),
        localRepositories.itemPhotos.listForInventoryItem(inventoryItem.id),
      ]);

      const latestScan = scans
        .filter((scan) => scan.inventoryItemId === inventoryItem.id)
        .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0] ?? null;

      return {
        inventoryItem,
        latestPriceEstimate,
        primaryPhoto: photos[0] ?? null,
        latestScan,
      } satisfies SavedItemSummary;
    }),
  );
}

export async function getScanById(id: string): Promise<Scan | null> {
  await initializeLocalStorage();
  return localRepositories.scans.getById(id);
}

export async function getStoredScanDetail(id: string): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();

  const staged = stagedScans.get(id);
  if (staged) return staged.detail;

  const scan = await localRepositories.scans.getById(id);
  if (!scan) return null;

  const inventoryItem = scan.inventoryItemId
    ? await localRepositories.inventoryItems.getById(scan.inventoryItemId)
    : null;
  const latestPriceEstimate = inventoryItem
    ? await localRepositories.priceEstimates.getLatestForInventoryItem(inventoryItem.id)
    : null;

  return {
    scan,
    inventoryItem,
    latestPriceEstimate,
    itemPhotos: inventoryItem ? await localRepositories.itemPhotos.listForInventoryItem(inventoryItem.id) : [],
    recognitionRecords: await localRepositories.recognitionRecords.listForScan(scan.id),
    ocrRecords: await localRepositories.ocrRecords.listForScan(scan.id),
    isSaved: true,
  };
}

export async function updateStoredScanTitle(id: string, nextTitle: string): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();

  const trimmedTitle = nextTitle.trim();
  if (!trimmedTitle) {
    return getStoredScanDetail(id);
  }

  const staged = stagedScans.get(id);
  if (staged) {
    const inventoryItem = staged.detail.inventoryItem;
    if (!inventoryItem || inventoryItem.displayName === trimmedTitle) {
      return staged.detail;
    }

    const nextDetail = {
      ...staged.detail,
      inventoryItem: {
        ...inventoryItem,
        displayName: trimmedTitle,
        updatedAt: new Date().toISOString(),
      },
    } satisfies StoredScanDetail;

    stagedScans.set(id, { detail: nextDetail });
    return nextDetail;
  }

  const scan = await localRepositories.scans.getById(id);
  if (!scan?.inventoryItemId) {
    return getStoredScanDetail(id);
  }

  const inventoryItem = await localRepositories.inventoryItems.getById(scan.inventoryItemId);
  if (!inventoryItem || inventoryItem.displayName === trimmedTitle) {
    return getStoredScanDetail(id);
  }

  await localRepositories.inventoryItems.update({
    ...inventoryItem,
    displayName: trimmedTitle,
    updatedAt: new Date().toISOString(),
  });

  return getStoredScanDetail(id);
}

export async function deleteScan(id: string): Promise<void> {
  await initializeLocalStorage();

  if (stagedScans.has(id)) {
    stagedScans.delete(id);
    return;
  }

  const scan = await localRepositories.scans.getById(id);
  await localRepositories.database.transaction(async () => {
    if (scan?.inventoryItemId) {
      await localRepositories.itemPhotos.deleteForInventoryItem(scan.inventoryItemId);
      await localRepositories.priceEstimates.deleteForInventoryItem(scan.inventoryItemId);
      await localRepositories.inventoryItems.delete(scan.inventoryItemId);
    }
    if (scan) {
      await localRepositories.recognitionRecords.deleteForScan(scan.id);
      await localRepositories.ocrRecords.deleteForScan(scan.id);
    }
    await localRepositories.scans.delete(id);
  });
}

export async function resetAllLocalData(): Promise<void> {
  await initializeLocalStorage();
  stagedScans.clear();
  await localRepositories.database.reset();
}

async function createStagedScanFromImageUri(input: {
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

  const { estimate } = await lookupPriceForInventoryItem({
    inventoryItem,
    identity,
    query: recognition.suggestedPricingQuery,
    allowMockFallback: input.allowMockPricing === true,
    persistResult: false,
  });

  const itemPhoto: ItemPhoto = {
    id: createLocalId("photo"),
    inventoryItemId: inventoryItem.id,
    scanId: scan.id,
    imageUri: input.imageUri,
    photoType: "primary",
    syncStatus: "local_only",
    createdAt: nowIso,
  };

  const recognitionRecord: RecognitionRecord = {
    id: createLocalId("recognition"),
    scanId: scan.id,
    provider: recognition.provider,
    createdAt: nowIso,
    ...(recognition.objectName ? { objectName: recognition.objectName } : {}),
    ...(recognition.brand ? { brand: recognition.brand } : {}),
    ...(recognition.model ? { model: recognition.model } : {}),
    ...(recognition.category ? { category: recognition.category } : {}),
    ...(recognition.variant ? { variant: recognition.variant } : {}),
    ...(recognition.conditionNotes ? { conditionNotes: recognition.conditionNotes } : {}),
    ...(recognition.confidence !== undefined ? { confidence: recognition.confidence } : {}),
    ...(recognition.suggestedPricingQuery ? { suggestedQuery: recognition.suggestedPricingQuery } : {}),
    rawJson: JSON.stringify(recognition.rawMetadata ?? {}),
  };

  const ocrRecord: OcrRecord = {
    id: createLocalId("ocr"),
    scanId: scan.id,
    provider: ocr.provider,
    createdAt: nowIso,
    ...(ocr.fullText ? { fullText: ocr.fullText } : {}),
    modelCandidatesJson: JSON.stringify(ocr.modelCandidates),
    serialCandidatesJson: JSON.stringify(ocr.serialCandidates),
    brandCandidatesJson: JSON.stringify(ocr.brandCandidates),
    rawJson: JSON.stringify(ocr.rawMetadata ?? {}),
  };

  const detail = {
    scan,
    inventoryItem,
    latestPriceEstimate: estimate,
    itemPhotos: [itemPhoto],
    recognitionRecords: [recognitionRecord],
    ocrRecords: [ocrRecord],
    isSaved: false,
  } satisfies StoredScanDetail;

  stagedScans.set(scan.id, { detail });
  return detail;
}

export async function createStagedScanFromImage(
  imageUri: string,
  requestPrefix = "captured-scan-request",
): Promise<StoredScanDetail> {
  return createStagedScanFromImageUri({ imageUri, requestPrefix });
}

export async function saveStoredScan(id: string): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();

  const staged = stagedScans.get(id);
  if (!staged) {
    return getStoredScanDetail(id);
  }

  const { detail } = staged;

  await localRepositories.database.transaction(async () => {
    if (detail.inventoryItem) {
      await localRepositories.inventoryItems.create(detail.inventoryItem);
    }
    await localRepositories.scans.create(detail.scan);
    for (const photo of detail.itemPhotos) {
      await localRepositories.itemPhotos.create(photo);
    }
    for (const record of detail.recognitionRecords) {
      await localRepositories.recognitionRecords.create(record);
    }
    for (const record of detail.ocrRecords) {
      await localRepositories.ocrRecords.create(record);
    }
    if (detail.latestPriceEstimate) {
      const existingEstimate = await localRepositories.priceEstimates.getById(detail.latestPriceEstimate.id);
      if (!existingEstimate) {
        await localRepositories.priceEstimates.create(detail.latestPriceEstimate);
      }
    }
  });

  stagedScans.delete(id);
  return getStoredScanDetail(id);
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
