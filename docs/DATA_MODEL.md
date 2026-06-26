# Pricernu Data Model

## 1. Data Model Principles

- SQLite is the immediate local source of truth.
- Convex is the cloud sync and canonical cache layer.
- Local IDs are stable and created before remote sync.
- Remote IDs are mapped back onto local records.
- User corrections are first-class records.
- Pricing is historical; do not overwrite old estimates without retaining snapshots.
- Cache keys should be explicit and inspectable.

## 2. Identifier Strategy

Every local entity should have:

- `id`: local UUID or stable generated ID
- `remote_id`: nullable Convex ID
- `created_at`
- `updated_at`
- `sync_status`

Suggested sync statuses:

- `local_only`
- `pending_create`
- `pending_update`
- `pending_delete`
- `synced`
- `conflict`
- `error`

## 3. SQLite Tables

### 3.1 scans

Represents a scan event. A scan may later become or attach to an inventory item.

Fields:

- `id` text primary key
- `remote_id` text nullable
- `captured_at` text not null
- `image_uri` text not null
- `thumbnail_uri` text nullable
- `inventory_item_id` text nullable
- `recognition_status` text not null
- `recognition_confidence` real nullable
- `ocr_text` text nullable
- `raw_recognition_json` text nullable
- `sync_status` text not null
- `created_at` text not null
- `updated_at` text not null

### 3.2 inventory_items

Represents a durable object the user may own, watch, buy, sell, or catalog.

Fields:

- `id` text primary key
- `remote_id` text nullable
- `canonical_object_id` text nullable
- `display_name` text not null
- `brand` text nullable
- `model` text nullable
- `category` text nullable
- `variant` text nullable
- `condition` text nullable
- `description` text nullable
- `user_notes` text nullable
- `ownership_status` text nullable
- `location` text nullable
- `purchase_price` real nullable
- `purchase_date` text nullable
- `sold_price` real nullable
- `sold_date` text nullable
- `sync_status` text not null
- `created_at` text not null
- `updated_at` text not null

Suggested ownership statuses:

- `unknown`
- `owned`
- `watching`
- `for_sale`
- `sold`
- `donated`
- `discarded`

### 3.3 item_photos

Associates multiple photos with an inventory item.

Fields:

- `id` text primary key
- `remote_id` text nullable
- `inventory_item_id` text not null
- `scan_id` text nullable
- `image_uri` text not null
- `thumbnail_uri` text nullable
- `photo_type` text nullable
- `sync_status` text not null
- `created_at` text not null

Suggested photo types:

- `primary`
- `label`
- `serial`
- `condition`
- `accessory`
- `other`

### 3.4 recognition_results

Stores object recognition attempts.

Fields:

- `id` text primary key
- `scan_id` text not null
- `provider` text not null
- `object_name` text nullable
- `brand` text nullable
- `model` text nullable
- `category` text nullable
- `variant` text nullable
- `condition_notes` text nullable
- `confidence` real nullable
- `suggested_query` text nullable
- `raw_json` text nullable
- `created_at` text not null

### 3.5 ocr_results

Stores OCR extraction attempts.

Fields:

- `id` text primary key
- `scan_id` text not null
- `provider` text not null
- `full_text` text nullable
- `model_candidates_json` text nullable
- `serial_candidates_json` text nullable
- `raw_json` text nullable
- `confidence` real nullable
- `created_at` text not null

### 3.6 price_estimates

Stores historical value estimates.

Fields:

- `id` text primary key
- `remote_id` text nullable
- `inventory_item_id` text nullable
- `canonical_object_id` text nullable
- `source_type` text not null
- `lookup_query` text nullable
- `currency` text not null default `USD`
- `low_price` real nullable
- `high_price` real nullable
- `median_price` real nullable
- `suggested_list_price` real nullable
- `suggested_buy_price` real nullable
- `retail_price` real nullable
- `confidence` real nullable
- `evidence_summary` text nullable
- `raw_evidence_json` text nullable
- `lookup_cache_key` text nullable
- `credit_cost` integer not null default 0
- `created_at` text not null
- `expires_at` text nullable

Suggested source types:

- `local_cache`
- `convex_cache`
- `brave_search`
- `manual`
- `future_provider`

### 3.7 lookup_cache

Caches normalized lookup results to avoid paid calls.

Fields:

- `id` text primary key
- `cache_key` text unique not null
- `normalized_query` text not null
- `brand` text nullable
- `model` text nullable
- `category` text nullable
- `result_json` text not null
- `created_at` text not null
- `expires_at` text nullable
- `hit_count` integer not null default 0

### 3.8 corrections

Captures user corrections and training signals.

Fields:

- `id` text primary key
- `scan_id` text nullable
- `inventory_item_id` text nullable
- `field_name` text not null
- `old_value` text nullable
- `new_value` text nullable
- `reason` text nullable
- `sync_status` text not null
- `created_at` text not null

### 3.9 sync_queue

Records local mutations that need remote sync.

Fields:

- `id` text primary key
- `entity_type` text not null
- `entity_id` text not null
- `operation` text not null
- `payload_json` text not null
- `retry_count` integer not null default 0
- `last_error` text nullable
- `created_at` text not null
- `next_attempt_at` text nullable

Operations:

- `create`
- `update`
- `delete`

### 3.10 settings

Simple key-value settings.

Fields:

- `key` text primary key
- `value_json` text not null
- `updated_at` text not null

## 4. Convex Collections

### 4.1 users

Fields:

- `clerkUserId`
- `createdAt`
- `updatedAt`
- `plan`
- `proEntitlement`
- `creditBalance`
- `settings`

### 4.2 devices

Fields:

- `userId`
- `platform`
- `appVersion`
- `deviceLabel`
- `lastSeenAt`

### 4.3 inventoryItems

Fields:

- `userId`
- `localId`
- `canonicalObjectId`
- `displayName`
- `brand`
- `model`
- `category`
- `variant`
- `condition`
- `description`
- `userNotes`
- `ownershipStatus`
- `location`
- `createdAt`
- `updatedAt`
- `deletedAt`

### 4.4 scanMetadata

MVP stores metadata only unless photo sync is later approved.

Fields:

- `userId`
- `localId`
- `inventoryItemId`
- `capturedAt`
- `recognitionConfidence`
- `ocrTextSummary`
- `createdAt`

### 4.5 canonicalObjects

Global/shared object identity record.

Fields:

- `normalizedName`
- `brand`
- `model`
- `category`
- `variant`
- `aliases`
- `sourceCount`
- `confidence`
- `createdAt`
- `updatedAt`

### 4.6 pricingSnapshots

Global/shared pricing evidence.

Fields:

- `canonicalObjectId`
- `normalizedQuery`
- `currency`
- `lowPrice`
- `highPrice`
- `medianPrice`
- `suggestedListPrice`
- `suggestedBuyPrice`
- `retailPrice`
- `confidence`
- `evidenceSummary`
- `sourceType`
- `createdAt`
- `expiresAt`

### 4.7 lookupEvents

Audit trail for cloud enrichment.

Fields:

- `userId`
- `query`
- `cacheKey`
- `provider`
- `cacheHit`
- `creditCost`
- `status`
- `createdAt`

### 4.8 creditLedger

Server-authoritative credit accounting.

Fields:

- `userId`
- `delta`
- `reason`
- `lookupEventId`
- `purchaseId`
- `createdAt`

Reasons:

- `initial_free_grant`
- `pro_purchase_grant`
- `credit_pack_purchase`
- `cloud_enrichment`
- `refund`
- `admin_adjustment`

### 4.9 corrections

Synced user corrections.

Fields:

- `userId`
- `localEntityId`
- `canonicalObjectId`
- `fieldName`
- `oldValue`
- `newValue`
- `createdAt`

## 5. Cache Key Strategy

Initial cache key should be based on normalized identity:

```txt
brand|model|category|normalized_object_name
```

Rules:

- lowercase
- trim whitespace
- remove repeated punctuation
- preserve model numbers
- prefer exact model when present
- fall back to brand + category + object name

Example:

```txt
ryobi|tss103|miter_saw|ryobi tss103 10 inch sliding compound miter saw
```

## 6. Migration Strategy

SQLite migrations should be explicit and versioned.

Suggested table:

### schema_migrations

- `version` integer primary key
- `name` text not null
- `applied_at` text not null

Do not rely on implicit schema creation once users have data.

## 7. Pending Decisions

- exact local ID generation library
- whether to use Drizzle, raw SQL, or a light local repository layer
- whether synced photos live in Convex, R2, or remain local-only in v1
- how anonymous free credits map to a future Clerk user
