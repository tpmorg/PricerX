import type { Scan } from "@pricernu/shared";
import { createSQLiteRepositories } from "../../storage/sqliteRepositories";

const repositories = createSQLiteRepositories();

export async function initializeLocalStorage(): Promise<void> {
  await repositories.database.initialize();
}

export async function createMockStoredScan(): Promise<Scan> {
  await initializeLocalStorage();

  const now = new Date().toISOString();
  const scan: Scan = {
    id: createLocalId(),
    capturedAt: now,
    imageUri: "mock://local-scan/ryobi-tss103.jpg",
    recognitionStatus: "recognized",
    recognitionConfidence: 0.91,
    ocrText: "RYOBI TSS103 10 IN SLIDING MITER SAW",
    rawRecognitionJson: JSON.stringify({
      provider: "mock-recognition",
      objectName: "Ryobi 10 inch sliding miter saw",
      brand: "Ryobi",
      model: "TSS103",
      category: "miter saw",
    }),
    syncStatus: "local_only",
    createdAt: now,
    updatedAt: now,
  };

  await repositories.scans.create(scan);
  return scan;
}

export async function listRecentScans(limit = 25): Promise<Scan[]> {
  await initializeLocalStorage();
  return repositories.scans.listRecent(limit);
}

export async function getScanById(id: string): Promise<Scan | null> {
  await initializeLocalStorage();
  return repositories.scans.getById(id);
}

export async function deleteScan(id: string): Promise<void> {
  await initializeLocalStorage();
  await repositories.scans.delete(id);
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
