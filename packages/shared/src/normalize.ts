import type { ConditionGrade, ObjectIdentity } from "./domain";

const MULTIPLE_SPACES = /\s+/g;
const MODEL_SAFE_PUNCTUATION = /[^a-z0-9\-_.\s]/gi;

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(MODEL_SAFE_PUNCTUATION, " ")
    .replace(MULTIPLE_SPACES, " ")
    .trim();
}

export function normalizeModel(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9\-_.]/g, "");
}

export function buildObjectIdentity(input: {
  objectName?: string;
  brand?: string;
  model?: string;
  category?: string;
  variant?: string;
}): ObjectIdentity {
  const brand = emptyToUndefined(input.brand);
  const model = emptyToUndefined(input.model);
  const category = emptyToUndefined(input.category);
  const variant = emptyToUndefined(input.variant);
  const baseName = emptyToUndefined(input.objectName) ?? [brand, model, category].filter(Boolean).join(" ");
  const loweredBaseName = baseName.toLowerCase();
  const missingPrefix = [brand, model].filter(
    (value): value is string => value !== undefined && !loweredBaseName.includes(value.toLowerCase()),
  );
  const displayName = [...missingPrefix, baseName].join(" ").replace(MULTIPLE_SPACES, " ").trim();

  return {
    displayName: displayName || "Unknown object",
    normalizedName: normalizeText(displayName || baseName || "unknown object"),
    ...(brand ? { brand, normalizedBrand: normalizeText(brand) } : {}),
    ...(model ? { model, normalizedModel: normalizeModel(model) } : {}),
    ...(category ? { category } : {}),
    ...(variant ? { variant } : {}),
  };
}

export function buildPricingQuery(identity: ObjectIdentity): string {
  const parts = [identity.brand, identity.model, identity.category || identity.displayName, "used price"];
  return parts.filter(Boolean).join(" ").replace(MULTIPLE_SPACES, " ").trim();
}

export function buildCacheKey(identity: ObjectIdentity, condition?: ConditionGrade): string {
  return [
    identity.normalizedBrand ?? "",
    identity.normalizedModel ?? "",
    identity.category ? normalizeText(identity.category) : "",
    identity.normalizedName,
    condition ?? "",
  ].join("|");
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
