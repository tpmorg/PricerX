import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  priceSnapshots: defineTable({
    lookupCacheKey: v.string(),
    normalizedName: v.string(),
    brand: v.optional(v.string()),
    model: v.optional(v.string()),
    category: v.optional(v.string()),
    currency: v.string(),
    lowPrice: v.optional(v.number()),
    highPrice: v.optional(v.number()),
    medianPrice: v.optional(v.number()),
    suggestedListPrice: v.optional(v.number()),
    suggestedBuyPrice: v.optional(v.number()),
    retailPrice: v.optional(v.number()),
    confidence: v.number(),
    sourceType: v.string(),
    evidenceSummary: v.string(),
    evidenceJson: v.string(),
    createdAt: v.string(),
    expiresAt: v.string(),
  }).index("by_cache_key", ["lookupCacheKey"]),

  // Fixed-window counters that bound fresh (non-cache) pricing lookups until
  // real accounts and the credit ledger exist.
  lookupRateLimits: defineTable({
    bucketKey: v.string(),
    windowStart: v.number(),
    count: v.number(),
  })
    .index("by_bucket", ["bucketKey", "windowStart"])
    .index("by_window_start", ["windowStart"]),
});