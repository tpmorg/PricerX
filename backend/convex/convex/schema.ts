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
});