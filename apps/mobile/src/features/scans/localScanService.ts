import type {
  ConditionGrade,
  InventoryItem,
  ItemPhoto,
  OcrRecord,
  PriceEstimate,
  RecognitionCandidate,
  RecognitionRecord,
  RecognitionResult,
  Scan,
} from "@pricernu/shared";
import { buildObjectIdentity, mockOcrProvider, mockRecognitionProvider, normalizeText, type OcrResult } from "@pricernu/shared";
import { lookupPriceForInventoryItem } from "@/features/pricing/localPricingService";
import { geminiNanoRecognitionProvider } from "@/features/recognition/geminiNanoRecognitionProvider";
import { pickPhotoFromLibrary } from "@/features/scans/imageCapture";
import { deleteAllPersistedPhotos, deletePersistedPhotos, persistPhoto } from "@/features/scans/photoStorage";
import { initializeLocalRepositories, localRepositories } from "@/storage/localRepositories";

export type StageStatus = "idle" | "running" | "done" | "failed";

export interface ScanProgress {
  recognition: StageStatus;
  pricing: StageStatus;
  recognitionError?: string;
  pricingError?: string;
}

export interface IdentityCandidate {
  key: string;
  displayName: string;
  brand?: string;
  model?: string;
  category?: string;
}

export interface IdentityRevision {
  displayName: string;
  brand?: string;
  model?: string;
  category?: string;
}

export interface StoredScanDetail {
  scan: Scan;
  inventoryItem: InventoryItem | null;
  latestPriceEstimate: PriceEstimate | null;
  itemPhotos: ItemPhoto[];
  recognitionRecords: RecognitionRecord[];
  ocrRecords: OcrRecord[];
  isSaved: boolean;
  progress: ScanProgress;
  candidates: IdentityCandidate[];
}

export interface SavedItemSummary {
  inventoryItem: InventoryItem;
  latestPriceEstimate: PriceEstimate | null;
  primaryPhoto: ItemPhoto | null;
  latestScan: Scan | null;
}

type StagedScanListener = (detail: StoredScanDetail) => void;

interface StagedScanBundle {
  detail: StoredScanDetail;
  allowMockPricing: boolean;
  pricingQuery?: string;
  pricingRunId: number;
  pricingTask: Promise<void> | null;
}

const stagedScans = new Map<string, StagedScanBundle>();
const stagedScanListeners = new Map<string, Set<StagedScanListener>>();

export async function initializeLocalStorage(): Promise<void> {
  await initializeLocalRepositories();
}

export function subscribeToStagedScan(id: string, listener: StagedScanListener): () => void {
  const listeners = stagedScanListeners.get(id) ?? new Set<StagedScanListener>();
  listeners.add(listener);
  stagedScanListeners.set(id, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stagedScanListeners.delete(id);
  };
}

export function peekStagedScan(id: string): StoredScanDetail | null {
  return stagedScans.get(id)?.detail ?? null;
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

export async function createStagedScanFromImage(
  imageUri: string,
  requestPrefix = "captured-scan-request",
): Promise<StoredScanDetail> {
  return createStagedScanFromImageUri({ imageUri, requestPrefix });
}

/**
 * Replace the item's identity with a user correction or a picked candidate, then
 * re-price it. Staged scans re-price in the background; saved scans wait for it.
 */
export async function reviseScanIdentity(id: string, revision: IdentityRevision): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();
  const identity = buildObjectIdentity({
    objectName: revision.displayName,
    brand: revision.brand,
    model: revision.model,
    category: revision.category,
  });
  const normalizedRevision: IdentityRevision = {
    displayName: identity.displayName,
    ...(identity.brand ? { brand: identity.brand } : {}),
    ...(identity.model ? { model: identity.model } : {}),
    ...(identity.category ? { category: identity.category } : {}),
  };

  if (stagedScans.has(id)) {
    // A user-supplied identity resolves a failed recognition; the scan row still
    // records that automatic recognition failed.
    const updated = updateStagedDetail(id, (detail) => {
      const { recognitionError: _recognitionError, ...progress } = detail.progress;
      return {
        ...applyIdentityToDetail(detail, normalizedRevision),
        latestPriceEstimate: null,
        progress: { ...progress, recognition: "done" },
      };
    });
    if (!updated) return null;
    void startStagedPricing(id, { query: identity.displayName });
    return stagedScans.get(id)?.detail ?? updated;
  }

  const saved = await loadSavedScanWithItem(id);
  if (!saved) return getStoredScanDetail(id);

  const inventoryItem = withIdentityFields(saved.inventoryItem, normalizedRevision, new Date().toISOString());
  await localRepositories.inventoryItems.update(inventoryItem);
  return repriceSavedItem(id, inventoryItem, { query: identity.displayName });
}

export async function setScanCondition(id: string, conditionGrade: ConditionGrade | null): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();
  const updatedAt = new Date().toISOString();

  if (stagedScans.has(id)) {
    const updated = updateStagedDetail(id, (detail) => {
      if (!detail.inventoryItem) return detail;
      return {
        ...detail,
        inventoryItem: withConditionGrade(detail.inventoryItem, conditionGrade, updatedAt),
        latestPriceEstimate: null,
      };
    });
    if (!updated?.inventoryItem) return updated;
    void startStagedPricing(id, {});
    return stagedScans.get(id)?.detail ?? updated;
  }

  const saved = await loadSavedScanWithItem(id);
  if (!saved) return getStoredScanDetail(id);

  const inventoryItem = withConditionGrade(saved.inventoryItem, conditionGrade, updatedAt);
  await localRepositories.inventoryItems.update(inventoryItem);
  const query = saved.latestPriceEstimate?.lookupQuery;
  return repriceSavedItem(id, inventoryItem, query ? { query } : {});
}

export async function refreshStoredScanPricing(id: string): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();

  if (stagedScans.has(id)) {
    void startStagedPricing(id, { forceRefresh: true });
    return stagedScans.get(id)?.detail ?? null;
  }

  const saved = await loadSavedScanWithItem(id);
  if (!saved) return getStoredScanDetail(id);

  const query = saved.latestPriceEstimate?.lookupQuery;
  return repriceSavedItem(id, saved.inventoryItem, { forceRefresh: true, ...(query ? { query } : {}) });
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
  const recognitionRecords = await localRepositories.recognitionRecords.listForScan(scan.id);

  return {
    scan,
    inventoryItem,
    latestPriceEstimate,
    itemPhotos: inventoryItem ? await localRepositories.itemPhotos.listForInventoryItem(inventoryItem.id) : [],
    recognitionRecords,
    ocrRecords: await localRepositories.ocrRecords.listForScan(scan.id),
    isSaved: true,
    progress: {
      recognition: scan.recognitionStatus === "failed" && !inventoryItem ? "failed" : "done",
      pricing: latestPriceEstimate ? "done" : "idle",
    },
    candidates: buildCandidates(recognitionRecords[0] ?? null),
  };
}

export async function deleteScan(id: string): Promise<void> {
  await initializeLocalStorage();

  if (stagedScans.has(id)) {
    stagedScans.delete(id);
    stagedScanListeners.delete(id);
    return;
  }

  const scan = await localRepositories.scans.getById(id);
  const photos = scan?.inventoryItemId
    ? await localRepositories.itemPhotos.listForInventoryItem(scan.inventoryItemId)
    : [];

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

  deletePersistedPhotos([...photos.map((photo) => photo.imageUri), ...(scan ? [scan.imageUri] : [])]);
}

export async function resetAllLocalData(): Promise<void> {
  await initializeLocalStorage();
  stagedScans.clear();
  stagedScanListeners.clear();
  await localRepositories.database.reset();
  deleteAllPersistedPhotos();
}

export async function saveStoredScan(id: string): Promise<StoredScanDetail | null> {
  await initializeLocalStorage();

  const pending = stagedScans.get(id);
  if (!pending) {
    return getStoredScanDetail(id);
  }

  // Let an in-flight price lookup land so the saved item keeps its estimate.
  await pending.pricingTask;
  const staged = stagedScans.get(id);
  if (!staged) return getStoredScanDetail(id);

  const { detail } = staged;
  if (!detail.inventoryItem) {
    throw new Error("Add an item name before saving.");
  }

  const originalUri = detail.scan.imageUri;
  const persistedUri = await persistPhoto(originalUri, detail.scan.id);
  const scan: Scan = { ...detail.scan, imageUri: persistedUri };
  const itemPhotos = detail.itemPhotos.map((photo) =>
    photo.imageUri === originalUri ? { ...photo, imageUri: persistedUri } : photo,
  );

  try {
    await localRepositories.database.transaction(async () => {
      if (detail.inventoryItem) {
        await localRepositories.inventoryItems.create(detail.inventoryItem);
      }
      await localRepositories.scans.create(scan);
      for (const photo of itemPhotos) {
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
  } catch (caught) {
    if (persistedUri !== originalUri) deletePersistedPhotos([persistedUri]);
    throw caught;
  }

  stagedScans.delete(id);
  stagedScanListeners.delete(id);
  return getStoredScanDetail(id);
}

async function createStagedScanFromImageUri(input: {
  imageUri: string;
  requestPrefix: string;
  allowMockPricing?: boolean;
  useMockRecognition?: boolean;
}): Promise<StoredScanDetail> {
  await initializeLocalStorage();

  const nowIso = new Date().toISOString();
  const scan: Scan = {
    id: createLocalId("scan"),
    capturedAt: nowIso,
    imageUri: input.imageUri,
    recognitionStatus: "pending",
    syncStatus: "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const detail: StoredScanDetail = {
    scan,
    inventoryItem: null,
    latestPriceEstimate: null,
    itemPhotos: [],
    recognitionRecords: [],
    ocrRecords: [],
    isSaved: false,
    progress: { recognition: "running", pricing: "idle" },
    candidates: [],
  };

  stagedScans.set(scan.id, {
    detail,
    allowMockPricing: input.allowMockPricing === true,
    pricingRunId: 0,
    pricingTask: null,
  });

  void runStagedRecognition(scan.id, {
    requestPrefix: input.requestPrefix,
    useMockRecognition: input.useMockRecognition === true,
  });

  return detail;
}

async function runStagedRecognition(
  scanId: string,
  input: { requestPrefix: string; useMockRecognition: boolean },
): Promise<void> {
  const staged = stagedScans.get(scanId);
  if (!staged) return;

  const { imageUri } = staged.detail.scan;
  const now = new Date();
  const requestId = createLocalId(input.requestPrefix);

  let ocr: OcrResult;
  let recognition: RecognitionResult;
  try {
    ocr = await getOcrResult(imageUri, requestId, now, input.useMockRecognition);
    const recognitionProvider = input.useMockRecognition ? mockRecognitionProvider : geminiNanoRecognitionProvider;
    recognition = await recognitionProvider.recognize({ imageUri, ocrText: ocr.fullText }, { requestId, now });
  } catch (caught) {
    updateStagedDetail(scanId, (detail) => ({
      ...detail,
      scan: { ...detail.scan, recognitionStatus: "failed", updatedAt: new Date().toISOString() },
      progress: {
        ...detail.progress,
        recognition: "failed",
        recognitionError: errorMessage(caught, "Could not identify this item."),
      },
    }));
    return;
  }

  const identity = buildObjectIdentity({
    objectName: recognition.objectName,
    brand: recognition.brand,
    model: recognition.model,
    category: recognition.category,
    variant: recognition.variant,
  });
  const recognizedAt = new Date().toISOString();
  const recognitionRecord = buildRecognitionRecord(scanId, recognition, recognizedAt);

  const updated = updateStagedDetail(scanId, (detail) => {
    const withIdentity = applyIdentityToDetail(
      detail,
      {
        displayName: identity.displayName,
        ...(identity.brand ? { brand: identity.brand } : {}),
        ...(identity.model ? { model: identity.model } : {}),
        ...(identity.category ? { category: identity.category } : {}),
      },
      {
        ...(identity.variant ? { variant: identity.variant } : {}),
        ...(recognition.conditionNotes ? { condition: recognition.conditionNotes } : {}),
      },
    );

    return {
      ...withIdentity,
      scan: {
        ...withIdentity.scan,
        recognitionStatus: "recognized",
        recognitionConfidence: recognition.confidence,
        rawRecognitionJson: JSON.stringify({ recognition, ocr }),
        updatedAt: recognizedAt,
        ...(ocr.fullText ? { ocrText: ocr.fullText } : {}),
      },
      recognitionRecords: [recognitionRecord],
      ocrRecords: [buildOcrRecord(scanId, ocr, recognizedAt)],
      candidates: buildCandidates(recognitionRecord),
      progress: { recognition: "done", pricing: detail.progress.pricing },
    };
  });

  if (updated) {
    void startStagedPricing(scanId, recognition.suggestedPricingQuery ? { query: recognition.suggestedPricingQuery } : {});
  }
}

function startStagedPricing(scanId: string, input: { query?: string; forceRefresh?: boolean }): Promise<void> {
  const staged = stagedScans.get(scanId);
  const inventoryItem = staged?.detail.inventoryItem;
  if (!staged || !inventoryItem) return Promise.resolve();

  const runId = staged.pricingRunId + 1;
  const query = input.query ?? staged.pricingQuery;
  const task = (async () => {
    try {
      const { estimate } = await lookupPriceForInventoryItem({
        inventoryItem,
        ...(query ? { query } : {}),
        forceRefresh: input.forceRefresh === true,
        allowMockFallback: staged.allowMockPricing,
        persistResult: false,
      });
      updateStagedDetail(
        scanId,
        (detail) => ({
          ...detail,
          latestPriceEstimate: estimate,
          progress: withoutPricingError({ ...detail.progress, pricing: "done" }),
        }),
        runId,
      );
    } catch (caught) {
      updateStagedDetail(
        scanId,
        (detail) => ({
          ...detail,
          progress: {
            ...detail.progress,
            pricing: "failed",
            pricingError: errorMessage(caught, "Could not look up pricing."),
          },
        }),
        runId,
      );
    }
  })();

  stagedScans.set(scanId, {
    ...staged,
    pricingRunId: runId,
    pricingTask: task,
    ...(query ? { pricingQuery: query } : {}),
  });
  updateStagedDetail(scanId, (detail) => ({
    ...detail,
    progress: withoutPricingError({ ...detail.progress, pricing: "running" }),
  }));

  return task;
}

/**
 * Apply an update to a staged scan and notify subscribers. When `pricingRunId` is
 * given, the update is dropped if a newer lookup has started or the scan is gone.
 */
function updateStagedDetail(
  scanId: string,
  update: (detail: StoredScanDetail) => StoredScanDetail,
  pricingRunId?: number,
): StoredScanDetail | null {
  const staged = stagedScans.get(scanId);
  if (!staged) return null;
  if (pricingRunId !== undefined && staged.pricingRunId !== pricingRunId) return null;

  const detail = update(staged.detail);
  stagedScans.set(scanId, { ...staged, detail });
  stagedScanListeners.get(scanId)?.forEach((listener) => listener(detail));
  return detail;
}

function applyIdentityToDetail(
  detail: StoredScanDetail,
  revision: IdentityRevision,
  extras: { variant?: string; condition?: string } = {},
): StoredScanDetail {
  const nowIso = new Date().toISOString();
  const inventoryItem = detail.inventoryItem
    ? withIdentityFields(detail.inventoryItem, revision, nowIso)
    : withIdentityFields(
        {
          id: createLocalId("item"),
          displayName: revision.displayName,
          ownershipStatus: "unknown",
          syncStatus: "local_only",
          createdAt: nowIso,
          updatedAt: nowIso,
          ...extras,
        },
        revision,
        nowIso,
      );

  const itemPhotos = detail.itemPhotos.length > 0
    ? detail.itemPhotos
    : [
        {
          id: createLocalId("photo"),
          inventoryItemId: inventoryItem.id,
          scanId: detail.scan.id,
          imageUri: detail.scan.imageUri,
          photoType: "primary",
          syncStatus: "local_only",
          createdAt: nowIso,
        } satisfies ItemPhoto,
      ];

  return {
    ...detail,
    scan: { ...detail.scan, inventoryItemId: inventoryItem.id, updatedAt: nowIso },
    inventoryItem,
    itemPhotos,
  };
}

function withIdentityFields(item: InventoryItem, revision: IdentityRevision, updatedAt: string): InventoryItem {
  const { brand: _brand, model: _model, category: _category, ...rest } = item;
  return {
    ...rest,
    displayName: revision.displayName,
    updatedAt,
    ...(revision.brand ? { brand: revision.brand } : {}),
    ...(revision.model ? { model: revision.model } : {}),
    ...(revision.category ? { category: revision.category } : {}),
  };
}

function withConditionGrade(item: InventoryItem, conditionGrade: ConditionGrade | null, updatedAt: string): InventoryItem {
  const { conditionGrade: _conditionGrade, ...rest } = item;
  return { ...rest, updatedAt, ...(conditionGrade ? { conditionGrade } : {}) };
}

function withoutPricingError(progress: ScanProgress): ScanProgress {
  const { pricingError: _pricingError, ...rest } = progress;
  return rest;
}

async function loadSavedScanWithItem(id: string): Promise<{
  inventoryItem: InventoryItem;
  latestPriceEstimate: PriceEstimate | null;
} | null> {
  const scan = await localRepositories.scans.getById(id);
  if (!scan?.inventoryItemId) return null;

  const inventoryItem = await localRepositories.inventoryItems.getById(scan.inventoryItemId);
  if (!inventoryItem) return null;

  return {
    inventoryItem,
    latestPriceEstimate: await localRepositories.priceEstimates.getLatestForInventoryItem(inventoryItem.id),
  };
}

async function repriceSavedItem(
  scanId: string,
  inventoryItem: InventoryItem,
  input: { query?: string; forceRefresh?: boolean },
): Promise<StoredScanDetail | null> {
  let pricingError: string | undefined;
  try {
    await lookupPriceForInventoryItem({
      inventoryItem,
      ...(input.query ? { query: input.query } : {}),
      forceRefresh: input.forceRefresh === true,
    });
  } catch (caught) {
    pricingError = errorMessage(caught, "Could not refresh pricing.");
  }

  const detail = await getStoredScanDetail(scanId);
  if (!detail || !pricingError) return detail;
  return { ...detail, progress: { ...detail.progress, pricing: "failed", pricingError } };
}

function buildRecognitionRecord(scanId: string, recognition: RecognitionResult, createdAt: string): RecognitionRecord {
  return {
    id: createLocalId("recognition"),
    scanId,
    provider: recognition.provider,
    createdAt,
    ...(recognition.objectName ? { objectName: recognition.objectName } : {}),
    ...(recognition.brand ? { brand: recognition.brand } : {}),
    ...(recognition.model ? { model: recognition.model } : {}),
    ...(recognition.category ? { category: recognition.category } : {}),
    ...(recognition.variant ? { variant: recognition.variant } : {}),
    ...(recognition.conditionNotes ? { conditionNotes: recognition.conditionNotes } : {}),
    ...(recognition.confidence !== undefined ? { confidence: recognition.confidence } : {}),
    ...(recognition.suggestedPricingQuery ? { suggestedQuery: recognition.suggestedPricingQuery } : {}),
    rawJson: JSON.stringify({
      metadata: recognition.rawMetadata ?? {},
      alternatives: recognition.alternatives ?? [],
    }),
  };
}

function buildOcrRecord(scanId: string, ocr: OcrResult, createdAt: string): OcrRecord {
  return {
    id: createLocalId("ocr"),
    scanId,
    provider: ocr.provider,
    createdAt,
    ...(ocr.fullText ? { fullText: ocr.fullText } : {}),
    modelCandidatesJson: JSON.stringify(ocr.modelCandidates),
    serialCandidatesJson: JSON.stringify(ocr.serialCandidates),
    brandCandidatesJson: JSON.stringify(ocr.brandCandidates),
    rawJson: JSON.stringify(ocr.rawMetadata ?? {}),
  };
}

function buildCandidates(record: RecognitionRecord | null): IdentityCandidate[] {
  if (!record) return [];

  const primary: RecognitionCandidate = {
    ...(record.objectName ? { objectName: record.objectName } : {}),
    ...(record.brand ? { brand: record.brand } : {}),
    ...(record.model ? { model: record.model } : {}),
    ...(record.category ? { category: record.category } : {}),
  };

  const seen = new Set<string>();
  const candidates: IdentityCandidate[] = [];
  for (const candidate of [primary, ...parseAlternatives(record.rawJson)]) {
    const identity = buildObjectIdentity(candidate);
    if (identity.displayName === "Unknown object") continue;

    const key = normalizeText(identity.displayName);
    if (seen.has(key)) continue;
    seen.add(key);

    candidates.push({
      key,
      displayName: identity.displayName,
      ...(identity.brand ? { brand: identity.brand } : {}),
      ...(identity.model ? { model: identity.model } : {}),
      ...(identity.category ? { category: identity.category } : {}),
    });
  }

  return candidates;
}

function parseAlternatives(rawJson: string | undefined): RecognitionCandidate[] {
  if (!rawJson) return [];

  try {
    const parsed = JSON.parse(rawJson) as { alternatives?: unknown };
    if (!Array.isArray(parsed.alternatives)) return [];
    return parsed.alternatives.filter(
      (candidate): candidate is RecognitionCandidate => Boolean(candidate) && typeof candidate === "object",
    );
  } catch {
    return [];
  }
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

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error && caught.message ? caught.message : fallback;
}

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
