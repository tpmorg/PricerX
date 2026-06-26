import * as SQLite from "expo-sqlite";
import type { RecognitionStatus, Scan, SyncStatus } from "@pricernu/shared";
import type {
  InventoryItemRepository,
  LocalDatabase,
  LocalStorageRepositories,
  PriceEstimateRepository,
  ScanRepository,
} from "./storageTypes";

const DATABASE_NAME = "pricernu.db";

interface ScanRow {
  id: string;
  remote_id: string | null;
  captured_at: string;
  image_uri: string;
  thumbnail_uri: string | null;
  inventory_item_id: string | null;
  recognition_status: RecognitionStatus;
  recognition_confidence: number | null;
  ocr_text: string | null;
  raw_recognition_json: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export class SQLiteLocalDatabase implements LocalDatabase {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async initialize(): Promise<void> {
    const db = await this.getDatabase();
    await runMigrations(db);
  }

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }

  getDatabase(): Promise<SQLite.SQLiteDatabase> {
    this.dbPromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
    return this.dbPromise;
  }
}

export class SQLiteScanRepository implements ScanRepository {
  constructor(private readonly database: SQLiteLocalDatabase) {}

  async create(scan: Scan): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync(
      `INSERT INTO scans (
        id,
        remote_id,
        captured_at,
        image_uri,
        thumbnail_uri,
        inventory_item_id,
        recognition_status,
        recognition_confidence,
        ocr_text,
        raw_recognition_json,
        sync_status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      toScanValues(scan),
    );
  }

  async getById(id: string): Promise<Scan | null> {
    const db = await this.database.getDatabase();
    const row = await db.getFirstAsync<ScanRow>("SELECT * FROM scans WHERE id = ?", [id]);
    return row ? toScan(row) : null;
  }

  async listRecent(limit: number): Promise<Scan[]> {
    const db = await this.database.getDatabase();
    const rows = await db.getAllAsync<ScanRow>(
      "SELECT * FROM scans ORDER BY captured_at DESC LIMIT ?",
      [limit],
    );
    return rows.map(toScan);
  }

  async update(scan: Scan): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync(
      `UPDATE scans SET
        remote_id = ?,
        captured_at = ?,
        image_uri = ?,
        thumbnail_uri = ?,
        inventory_item_id = ?,
        recognition_status = ?,
        recognition_confidence = ?,
        ocr_text = ?,
        raw_recognition_json = ?,
        sync_status = ?,
        created_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        scan.remoteId ?? null,
        scan.capturedAt,
        scan.imageUri,
        scan.thumbnailUri ?? null,
        scan.inventoryItemId ?? null,
        scan.recognitionStatus,
        scan.recognitionConfidence ?? null,
        scan.ocrText ?? null,
        scan.rawRecognitionJson ?? null,
        scan.syncStatus,
        scan.createdAt,
        scan.updatedAt,
        scan.id,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync("DELETE FROM scans WHERE id = ?", [id]);
  }
}

export function createSQLiteRepositories(): LocalStorageRepositories & { database: SQLiteLocalDatabase } {
  const database = new SQLiteLocalDatabase();
  return {
    database,
    scans: new SQLiteScanRepository(database),
    inventoryItems: notImplementedRepository<InventoryItemRepository>("inventory items"),
    priceEstimates: notImplementedRepository<PriceEstimateRepository>("price estimates"),
  };
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const migration = await db.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = 1",
  );

  if (migration) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      captured_at TEXT NOT NULL,
      image_uri TEXT NOT NULL,
      thumbnail_uri TEXT,
      inventory_item_id TEXT,
      recognition_status TEXT NOT NULL,
      recognition_confidence REAL,
      ocr_text TEXT,
      raw_recognition_json TEXT,
      sync_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS scans_captured_at_idx ON scans(captured_at DESC);
  `);

  await db.runAsync("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", [
    1,
    "create_scans",
    new Date().toISOString(),
  ]);
}

function toScanValues(scan: Scan): SQLite.SQLiteBindParams {
  return [
    scan.id,
    scan.remoteId ?? null,
    scan.capturedAt,
    scan.imageUri,
    scan.thumbnailUri ?? null,
    scan.inventoryItemId ?? null,
    scan.recognitionStatus,
    scan.recognitionConfidence ?? null,
    scan.ocrText ?? null,
    scan.rawRecognitionJson ?? null,
    scan.syncStatus,
    scan.createdAt,
    scan.updatedAt,
  ];
}

function toScan(row: ScanRow): Scan {
  return {
    id: row.id,
    capturedAt: row.captured_at,
    imageUri: row.image_uri,
    recognitionStatus: row.recognition_status,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.remote_id ? { remoteId: row.remote_id } : {}),
    ...(row.thumbnail_uri ? { thumbnailUri: row.thumbnail_uri } : {}),
    ...(row.inventory_item_id ? { inventoryItemId: row.inventory_item_id } : {}),
    ...(row.recognition_confidence !== null ? { recognitionConfidence: row.recognition_confidence } : {}),
    ...(row.ocr_text ? { ocrText: row.ocr_text } : {}),
    ...(row.raw_recognition_json ? { rawRecognitionJson: row.raw_recognition_json } : {}),
  };
}

function notImplementedRepository<T extends object>(name: string): T {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(`SQLite ${name} repository is not implemented yet.`);
      },
    },
  ) as T;
}
