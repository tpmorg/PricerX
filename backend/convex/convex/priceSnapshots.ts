import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export interface PriceSnapshotRow {
  _id: string;
  lookupCacheKey: string;
  normalizedName: string;
  brand?: string;
  model?: string;
  category?: string;
  currency: string;
  lowPrice?: number;
  highPrice?: number;
  medianPrice?: number;
  suggestedListPrice?: number;
  suggestedBuyPrice?: number;
  retailPrice?: number;
  confidence: number;
  sourceType: string;
  evidenceSummary: string;
  evidenceJson: string;
  createdAt: string;
  expiresAt: string;
}

export const getFreshSnapshot = internalQuery({
  args: {
    lookupCacheKey: v.string(),
    nowIso: v.string(),
  },
  handler: async (ctx, args): Promise<PriceSnapshotRow | null> => {
    const freshRow = await ctx.db
      .query("priceSnapshots")
      .withIndex("by_cache_key", (q) => q.eq("lookupCacheKey", args.lookupCacheKey))
      .order("desc")
      .filter((q) => q.gt(q.field("expiresAt"), args.nowIso))
      .first();
    if (!freshRow) return null;

    return {
      _id: freshRow._id,
      lookupCacheKey: freshRow.lookupCacheKey,
      normalizedName: freshRow.normalizedName,
      brand: freshRow.brand,
      model: freshRow.model,
      category: freshRow.category,
      currency: freshRow.currency,
      lowPrice: freshRow.lowPrice,
      highPrice: freshRow.highPrice,
      medianPrice: freshRow.medianPrice,
      suggestedListPrice: freshRow.suggestedListPrice,
      suggestedBuyPrice: freshRow.suggestedBuyPrice,
      retailPrice: freshRow.retailPrice,
      confidence: freshRow.confidence,
      sourceType: freshRow.sourceType,
      evidenceSummary: freshRow.evidenceSummary,
      evidenceJson: freshRow.evidenceJson,
      createdAt: freshRow.createdAt,
      expiresAt: freshRow.expiresAt,
    };
  },
});

export const recordSnapshot = internalMutation({
  args: {
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
  },
  handler: async (ctx, args): Promise<string> => {
    const id = await ctx.db.insert("priceSnapshots", args);
    return id;
  },
});