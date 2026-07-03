import * as SQLite from "expo-sqlite";
import type {
  InventoryItem,
  ItemPhoto,
  OcrRecord,
  OwnershipStatus,
  PriceEstimate,
  PriceSourceType,
  RecognitionRecord,
  RecognitionStatus,
  Scan,
  SyncStatus,
} from "@pricernu/shared";
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

const DATABASE_NAME = "pricernu.db";

type BindValue = string | number | null;

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

interface InventoryItemRow {
  id: string;
  remote_id: string | null;
  canonical_object_id: string | null;
  display_name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  variant: string | null;
  condition: string | null;
  description: string | null;
  user_notes: string | null;
  ownership_status: OwnershipStatus;
  location: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  sold_price: number | null;
  sold_date: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

interface PriceEstimateRow {
  id: string;
  remote_id: string | null;
  inventory_item_id: string | null;
  canonical_object_id: string | null;
  source_type: PriceSourceType;
  lookup_query: string | null;
  currency: string;
  low_price: number | null;
  high_price: number | null;
  median_price: number | null;
  suggested_list_price: number | null;
  suggested_buy_price: number | null;
  retail_price: number | null;
  confidence: number | null;
  evidence_summary: string | null;
  raw_evidence_json: string | null;
  lookup_cache_key: string | null;
  credit_cost: number;
  created_at: string;
  expires_at: string | null;
}

interface ItemPhotoRow {
  id: string;
  remote_id: string | null;
  inventory_item_id: string;
  scan_id: string | null;
  image_uri: string;
  thumbnail_uri: string | null;
  photo_type: string | null;
  sync_status: SyncStatus;
  created_at: string;
}

interface RecognitionRecordRow {
  id: string;
  scan_id: string;
  provider: string;
  object_name: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  variant: string | null;
  condition_notes: string | null;
  confidence: number | null;
  suggested_query: string | null;
  raw_json: string | null;
  created_at: string;
}

interface OcrRecordRow {
  id: string;
  scan_id: string;
  provider: string;
  full_text: string | null;
  model_candidates_json: string | null;
  serial_candidates_json: string | null;
  brand_candidates_json: string | null;
  raw_json: string | null;
  confidence: number | null;
  created_at: string;
}

export class SQLiteLocalDatabase implements LocalDatabase {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async initialize(): Promise<void> {
    const db = await this.getDatabase();
    await runMigrations(db);
  }

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    const db = await this.getDatabase();
    await db.execAsync("BEGIN TRANSACTION;");

    try {
      const result = await operation();
      await db.execAsync("COMMIT;");
      return result;
    } catch (error) {
      await db.execAsync("ROLLBACK;");
      throw error;
    }
  }

  async reset(): Promise<void> {
    const db = await this.getDatabase();
    await db.execAsync("BEGIN TRANSACTION;");

    try {
      await db.execAsync(`
        DELETE FROM ocr_results;
        DELETE FROM recognition_results;
        DELETE FROM item_photos;
        DELETE FROM price_estimates;
        DELETE FROM scans;
        DELETE FROM inventory_items;
      `);
      await db.execAsync("COMMIT;");
    } catch (error) {
      await db.execAsync("ROLLBACK;");
      throw error;
    }
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

export class SQLiteInventoryItemRepository implements InventoryItemRepository {
  constructor(private readonly database: SQLiteLocalDatabase) {}

  async create(item: InventoryItem): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync(
      `INSERT INTO inventory_items (
        id,
        remote_id,
        canonical_object_id,
        display_name,
        brand,
        model,
        category,
        variant,
        condition,
        description,
        user_notes,
        ownership_status,
        location,
        purchase_price,
        purchase_date,
        sold_price,
        sold_date,
        sync_status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      toInventoryItemValues(item),
    );
  }

  async getById(id: string): Promise<InventoryItem | null> {
    const db = await this.database.getDatabase();
    const row = await db.getFirstAsync<InventoryItemRow>("SELECT * FROM inventory_items WHERE id = ?", [id]);
    return row ? toInventoryItem(row) : null;
  }

  async listRecent(limit: number): Promise<InventoryItem[]> {
    const db = await this.database.getDatabase();
    const rows = await db.getAllAsync<InventoryItemRow>(
      "SELECT * FROM inventory_items ORDER BY updated_at DESC LIMIT ?",
      [limit],
    );
    return rows.map(toInventoryItem);
  }

  async update(item: InventoryItem): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync(
      `UPDATE inventory_items SET
        remote_id = ?,
        canonical_object_id = ?,
        display_name = ?,
        brand = ?,
        model = ?,
        category = ?,
        variant = ?,
        condition = ?,
        description = ?,
        user_notes = ?,
        ownership_status = ?,
        location = ?,
        purchase_price = ?,
        purchase_date = ?,
        sold_price = ?,
        sold_date = ?,
        sync_status = ?,
        created_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        item.remoteId ?? null,
        item.canonicalObjectId ?? null,
        item.displayName,
        item.brand ?? null,
        item.model ?? null,
        item.category ?? null,
        item.variant ?? null,
        item.condition ?? null,
        item.description ?? null,
        item.userNotes ?? null,
        item.ownershipStatus,
        item.location ?? null,
        item.purchasePrice ?? null,
        item.purchaseDate ?? null,
        item.soldPrice ?? null,
        item.soldDate ?? null,
        item.syncStatus,
        item.createdAt,
        item.updatedAt,
        item.id,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync("DELETE FROM inventory_items WHERE id = ?", [id]);
  }
}

export class SQLitePriceEstimateRepository implements PriceEstimateRepository {
  constructor(private readonly database: SQLiteLocalDatabase) {}

  async create(estimate: PriceEstimate): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync(
      `INSERT INTO price_estimates (
        id,
        remote_id,
        inventory_item_id,
        canonical_object_id,
        source_type,
        lookup_query,
        currency,
        low_price,
        high_price,
        median_price,
        suggested_list_price,
        suggested_buy_price,
        retail_price,
        confidence,
        evidence_summary,
        raw_evidence_json,
        lookup_cache_key,
        credit_cost,
        created_at,
        expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      toPriceEstimateValues(estimate),
    );
  }

  async getById(id: string): Promise<PriceEstimate | null> {
    const db = await this.database.getDatabase();
    const row = await db.getFirstAsync<PriceEstimateRow>("SELECT * FROM price_estimates WHERE id = ?", [id]);
    return row ? toPriceEstimate(row) : null;
  }

  async listForInventoryItem(inventoryItemId: string): Promise<PriceEstimate[]> {
    const db = await this.database.getDatabase();
    const rows = await db.getAllAsync<PriceEstimateRow>(
      "SELECT * FROM price_estimates WHERE inventory_item_id = ? ORDER BY created_at DESC",
      [inventoryItemId],
    );
    return rows.map(toPriceEstimate);
  }

  async getLatestForInventoryItem(inventoryItemId: string): Promise<PriceEstimate | null> {
    const db = await this.database.getDatabase();
    const row = await db.getFirstAsync<PriceEstimateRow>(
      "SELECT * FROM price_estimates WHERE inventory_item_id = ? ORDER BY created_at DESC LIMIT 1",
      [inventoryItemId],
    );
    return row ? toPriceEstimate(row) : null;
  }

  async findFreshByCacheKey(lookupCacheKey: string, nowIso: string): Promise<PriceEstimate | null> {
    const db = await this.database.getDatabase();
    const row = await db.getFirstAsync<PriceEstimateRow>(
      `SELECT * FROM price_estimates
       WHERE lookup_cache_key = ?
         AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY created_at DESC
       LIMIT 1`,
      [lookupCacheKey, nowIso],
    );
    return row ? toPriceEstimate(row) : null;
  }

  async deleteForInventoryItem(inventoryItemId: string): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync("DELETE FROM price_estimates WHERE inventory_item_id = ?", [inventoryItemId]);
  }
}

export class SQLiteItemPhotoRepository implements ItemPhotoRepository {
  constructor(private readonly database: SQLiteLocalDatabase) {}

  async create(photo: ItemPhoto): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync(
      `INSERT INTO item_photos (
        id,
        remote_id,
        inventory_item_id,
        scan_id,
        image_uri,
        thumbnail_uri,
        photo_type,
        sync_status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      toItemPhotoValues(photo),
    );
  }

  async listForInventoryItem(inventoryItemId: string): Promise<ItemPhoto[]> {
    const db = await this.database.getDatabase();
    const rows = await db.getAllAsync<ItemPhotoRow>(
      "SELECT * FROM item_photos WHERE inventory_item_id = ? ORDER BY created_at DESC",
      [inventoryItemId],
    );
    return rows.map(toItemPhoto);
  }

  async listForScan(scanId: string): Promise<ItemPhoto[]> {
    const db = await this.database.getDatabase();
    const rows = await db.getAllAsync<ItemPhotoRow>(
      "SELECT * FROM item_photos WHERE scan_id = ? ORDER BY created_at DESC",
      [scanId],
    );
    return rows.map(toItemPhoto);
  }

  async deleteForInventoryItem(inventoryItemId: string): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync("DELETE FROM item_photos WHERE inventory_item_id = ?", [inventoryItemId]);
  }
}

export class SQLiteRecognitionRecordRepository implements RecognitionRecordRepository {
  constructor(private readonly database: SQLiteLocalDatabase) {}

  async create(record: RecognitionRecord): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync(
      `INSERT INTO recognition_results (
        id,
        scan_id,
        provider,
        object_name,
        brand,
        model,
        category,
        variant,
        condition_notes,
        confidence,
        suggested_query,
        raw_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      toRecognitionRecordValues(record),
    );
  }

  async listForScan(scanId: string): Promise<RecognitionRecord[]> {
    const db = await this.database.getDatabase();
    const rows = await db.getAllAsync<RecognitionRecordRow>(
      "SELECT * FROM recognition_results WHERE scan_id = ? ORDER BY created_at DESC",
      [scanId],
    );
    return rows.map(toRecognitionRecord);
  }

  async getLatestForScan(scanId: string): Promise<RecognitionRecord | null> {
    const db = await this.database.getDatabase();
    const row = await db.getFirstAsync<RecognitionRecordRow>(
      "SELECT * FROM recognition_results WHERE scan_id = ? ORDER BY created_at DESC LIMIT 1",
      [scanId],
    );
    return row ? toRecognitionRecord(row) : null;
  }

  async deleteForScan(scanId: string): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync("DELETE FROM recognition_results WHERE scan_id = ?", [scanId]);
  }
}

export class SQLiteOcrRecordRepository implements OcrRecordRepository {
  constructor(private readonly database: SQLiteLocalDatabase) {}

  async create(record: OcrRecord): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync(
      `INSERT INTO ocr_results (
        id,
        scan_id,
        provider,
        full_text,
        model_candidates_json,
        serial_candidates_json,
        brand_candidates_json,
        raw_json,
        confidence,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      toOcrRecordValues(record),
    );
  }

  async listForScan(scanId: string): Promise<OcrRecord[]> {
    const db = await this.database.getDatabase();
    const rows = await db.getAllAsync<OcrRecordRow>(
      "SELECT * FROM ocr_results WHERE scan_id = ? ORDER BY created_at DESC",
      [scanId],
    );
    return rows.map(toOcrRecord);
  }

  async getLatestForScan(scanId: string): Promise<OcrRecord | null> {
    const db = await this.database.getDatabase();
    const row = await db.getFirstAsync<OcrRecordRow>(
      "SELECT * FROM ocr_results WHERE scan_id = ? ORDER BY created_at DESC LIMIT 1",
      [scanId],
    );
    return row ? toOcrRecord(row) : null;
  }

  async deleteForScan(scanId: string): Promise<void> {
    const db = await this.database.getDatabase();
    await db.runAsync("DELETE FROM ocr_results WHERE scan_id = ?", [scanId]);
  }
}

export function createSQLiteRepositories(): LocalStorageRepositories & { database: SQLiteLocalDatabase } {
  const database = new SQLiteLocalDatabase();
  return {
    database,
    scans: new SQLiteScanRepository(database),
    inventoryItems: new SQLiteInventoryItemRepository(database),
    priceEstimates: new SQLitePriceEstimateRepository(database),
    itemPhotos: new SQLiteItemPhotoRepository(database),
    recognitionRecords: new SQLiteRecognitionRecordRepository(database),
    ocrRecords: new SQLiteOcrRecordRepository(database),
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

  await applyMigration(db, 1, "create_scans", `
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

  await applyMigration(db, 2, "create_inventory_and_price_estimates", `
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      canonical_object_id TEXT,
      display_name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      category TEXT,
      variant TEXT,
      condition TEXT,
      description TEXT,
      user_notes TEXT,
      ownership_status TEXT NOT NULL,
      location TEXT,
      purchase_price REAL,
      purchase_date TEXT,
      sold_price REAL,
      sold_date TEXT,
      sync_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_estimates (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      inventory_item_id TEXT,
      canonical_object_id TEXT,
      source_type TEXT NOT NULL,
      lookup_query TEXT,
      currency TEXT NOT NULL,
      low_price REAL,
      high_price REAL,
      median_price REAL,
      suggested_list_price REAL,
      suggested_buy_price REAL,
      retail_price REAL,
      confidence REAL,
      evidence_summary TEXT,
      raw_evidence_json TEXT,
      lookup_cache_key TEXT,
      credit_cost INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      expires_at TEXT
    );

    CREATE INDEX IF NOT EXISTS inventory_items_updated_at_idx ON inventory_items(updated_at DESC);
    CREATE INDEX IF NOT EXISTS price_estimates_inventory_item_id_idx ON price_estimates(inventory_item_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS price_estimates_lookup_cache_key_idx ON price_estimates(lookup_cache_key, created_at DESC);
  `);

  await applyMigration(db, 3, "create_local_analysis_tables", `
    CREATE TABLE IF NOT EXISTS item_photos (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      inventory_item_id TEXT NOT NULL,
      scan_id TEXT,
      image_uri TEXT NOT NULL,
      thumbnail_uri TEXT,
      photo_type TEXT,
      sync_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recognition_results (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      object_name TEXT,
      brand TEXT,
      model TEXT,
      category TEXT,
      variant TEXT,
      condition_notes TEXT,
      confidence REAL,
      suggested_query TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ocr_results (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      full_text TEXT,
      model_candidates_json TEXT,
      serial_candidates_json TEXT,
      brand_candidates_json TEXT,
      raw_json TEXT,
      confidence REAL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS item_photos_inventory_item_id_idx ON item_photos(inventory_item_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS item_photos_scan_id_idx ON item_photos(scan_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS recognition_results_scan_id_idx ON recognition_results(scan_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS ocr_results_scan_id_idx ON ocr_results(scan_id, created_at DESC);
  `);
}

async function applyMigration(
  db: SQLite.SQLiteDatabase,
  version: number,
  name: string,
  sql: string,
): Promise<void> {
  const migration = await db.getFirstAsync<{ version: number }>(
    "SELECT version FROM schema_migrations WHERE version = ?",
    [version],
  );

  if (migration) return;

  await db.execAsync(sql);
  await db.runAsync("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)", [
    version,
    name,
    new Date().toISOString(),
  ]);
}

function toScanValues(scan: Scan): BindValue[] {
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

function toInventoryItemValues(item: InventoryItem): BindValue[] {
  return [
    item.id,
    item.remoteId ?? null,
    item.canonicalObjectId ?? null,
    item.displayName,
    item.brand ?? null,
    item.model ?? null,
    item.category ?? null,
    item.variant ?? null,
    item.condition ?? null,
    item.description ?? null,
    item.userNotes ?? null,
    item.ownershipStatus,
    item.location ?? null,
    item.purchasePrice ?? null,
    item.purchaseDate ?? null,
    item.soldPrice ?? null,
    item.soldDate ?? null,
    item.syncStatus,
    item.createdAt,
    item.updatedAt,
  ];
}

function toInventoryItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    displayName: row.display_name,
    ownershipStatus: row.ownership_status,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.remote_id ? { remoteId: row.remote_id } : {}),
    ...(row.canonical_object_id ? { canonicalObjectId: row.canonical_object_id } : {}),
    ...(row.brand ? { brand: row.brand } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.category ? { category: row.category } : {}),
    ...(row.variant ? { variant: row.variant } : {}),
    ...(row.condition ? { condition: row.condition } : {}),
    ...(row.description ? { description: row.description } : {}),
    ...(row.user_notes ? { userNotes: row.user_notes } : {}),
    ...(row.location ? { location: row.location } : {}),
    ...(row.purchase_price !== null ? { purchasePrice: row.purchase_price } : {}),
    ...(row.purchase_date ? { purchaseDate: row.purchase_date } : {}),
    ...(row.sold_price !== null ? { soldPrice: row.sold_price } : {}),
    ...(row.sold_date ? { soldDate: row.sold_date } : {}),
  };
}

function toPriceEstimateValues(estimate: PriceEstimate): BindValue[] {
  return [
    estimate.id,
    estimate.remoteId ?? null,
    estimate.inventoryItemId ?? null,
    estimate.canonicalObjectId ?? null,
    estimate.sourceType,
    estimate.lookupQuery ?? null,
    estimate.currency,
    estimate.lowPrice ?? null,
    estimate.highPrice ?? null,
    estimate.medianPrice ?? null,
    estimate.suggestedListPrice ?? null,
    estimate.suggestedBuyPrice ?? null,
    estimate.retailPrice ?? null,
    estimate.confidence ?? null,
    estimate.evidenceSummary ?? null,
    estimate.rawEvidenceJson ?? null,
    estimate.lookupCacheKey ?? null,
    estimate.creditCost,
    estimate.createdAt,
    estimate.expiresAt ?? null,
  ];
}

function toPriceEstimate(row: PriceEstimateRow): PriceEstimate {
  return {
    id: row.id,
    sourceType: row.source_type,
    currency: row.currency,
    creditCost: row.credit_cost,
    createdAt: row.created_at,
    ...(row.remote_id ? { remoteId: row.remote_id } : {}),
    ...(row.inventory_item_id ? { inventoryItemId: row.inventory_item_id } : {}),
    ...(row.canonical_object_id ? { canonicalObjectId: row.canonical_object_id } : {}),
    ...(row.lookup_query ? { lookupQuery: row.lookup_query } : {}),
    ...(row.low_price !== null ? { lowPrice: row.low_price } : {}),
    ...(row.high_price !== null ? { highPrice: row.high_price } : {}),
    ...(row.median_price !== null ? { medianPrice: row.median_price } : {}),
    ...(row.suggested_list_price !== null ? { suggestedListPrice: row.suggested_list_price } : {}),
    ...(row.suggested_buy_price !== null ? { suggestedBuyPrice: row.suggested_buy_price } : {}),
    ...(row.retail_price !== null ? { retailPrice: row.retail_price } : {}),
    ...(row.confidence !== null ? { confidence: row.confidence } : {}),
    ...(row.evidence_summary ? { evidenceSummary: row.evidence_summary } : {}),
    ...(row.raw_evidence_json ? { rawEvidenceJson: row.raw_evidence_json } : {}),
    ...(row.lookup_cache_key ? { lookupCacheKey: row.lookup_cache_key } : {}),
    ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
  };
}

function toItemPhotoValues(photo: ItemPhoto): BindValue[] {
  return [
    photo.id,
    photo.remoteId ?? null,
    photo.inventoryItemId,
    photo.scanId ?? null,
    photo.imageUri,
    photo.thumbnailUri ?? null,
    photo.photoType ?? null,
    photo.syncStatus,
    photo.createdAt,
  ];
}

function toItemPhoto(row: ItemPhotoRow): ItemPhoto {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    imageUri: row.image_uri,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    ...(row.remote_id ? { remoteId: row.remote_id } : {}),
    ...(row.scan_id ? { scanId: row.scan_id } : {}),
    ...(row.thumbnail_uri ? { thumbnailUri: row.thumbnail_uri } : {}),
    ...(row.photo_type ? { photoType: row.photo_type as ItemPhoto["photoType"] } : {}),
  };
}

function toRecognitionRecordValues(record: RecognitionRecord): BindValue[] {
  return [
    record.id,
    record.scanId,
    record.provider,
    record.objectName ?? null,
    record.brand ?? null,
    record.model ?? null,
    record.category ?? null,
    record.variant ?? null,
    record.conditionNotes ?? null,
    record.confidence ?? null,
    record.suggestedQuery ?? null,
    record.rawJson ?? null,
    record.createdAt,
  ];
}

function toRecognitionRecord(row: RecognitionRecordRow): RecognitionRecord {
  return {
    id: row.id,
    scanId: row.scan_id,
    provider: row.provider,
    createdAt: row.created_at,
    ...(row.object_name ? { objectName: row.object_name } : {}),
    ...(row.brand ? { brand: row.brand } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.category ? { category: row.category } : {}),
    ...(row.variant ? { variant: row.variant } : {}),
    ...(row.condition_notes ? { conditionNotes: row.condition_notes } : {}),
    ...(row.confidence !== null ? { confidence: row.confidence } : {}),
    ...(row.suggested_query ? { suggestedQuery: row.suggested_query } : {}),
    ...(row.raw_json ? { rawJson: row.raw_json } : {}),
  };
}

function toOcrRecordValues(record: OcrRecord): BindValue[] {
  return [
    record.id,
    record.scanId,
    record.provider,
    record.fullText ?? null,
    record.modelCandidatesJson ?? null,
    record.serialCandidatesJson ?? null,
    record.brandCandidatesJson ?? null,
    record.rawJson ?? null,
    record.confidence ?? null,
    record.createdAt,
  ];
}

function toOcrRecord(row: OcrRecordRow): OcrRecord {
  return {
    id: row.id,
    scanId: row.scan_id,
    provider: row.provider,
    createdAt: row.created_at,
    ...(row.full_text ? { fullText: row.full_text } : {}),
    ...(row.model_candidates_json ? { modelCandidatesJson: row.model_candidates_json } : {}),
    ...(row.serial_candidates_json ? { serialCandidatesJson: row.serial_candidates_json } : {}),
    ...(row.brand_candidates_json ? { brandCandidatesJson: row.brand_candidates_json } : {}),
    ...(row.raw_json ? { rawJson: row.raw_json } : {}),
    ...(row.confidence !== null ? { confidence: row.confidence } : {}),
  };
}
