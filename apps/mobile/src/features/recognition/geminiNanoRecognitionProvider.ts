import type { RecognitionProvider, RecognitionResult } from "@pricernu/shared";
import { buildObjectIdentity } from "@pricernu/shared";
import { geminiNanoModule, type GeminiNanoStatus } from "@/features/recognition/geminiNanoModule";

interface ParsedIdentity {
  objectName?: string;
  brand?: string;
  model?: string;
  category?: string;
  variant?: string;
  conditionNotes?: string;
  confidence?: number;
  suggestedPricingQuery?: string;
}

export const geminiNanoRecognitionProvider: RecognitionProvider = {
  id: "gemini-nano-aicore",
  label: "Gemini Nano AICore",
  async recognize(input, context): Promise<RecognitionResult> {
    const status = await getReadyStatus();
    const image = await geminiNanoModule.describeImage({ uri: input.imageUri });
    const description = image.description.trim();

    if (!description) {
      throw new Error("Gemini Nano did not return an image description for this photo.");
    }

    const parsed = await parseIdentityWithGemini(description);
    const objectName = parsed.objectName?.trim() || summarizeDescription(description);
    const identity = buildObjectIdentity({
      objectName,
      brand: parsed.brand,
      model: parsed.model,
      category: parsed.category,
      variant: parsed.variant,
    });
    const suggestedPricingQuery = buildSuggestedPricingQuery(parsed, identity.displayName, description);

    return {
      objectName,
      confidence: clampConfidence(parsed.confidence ?? 0.68),
      provider: geminiNanoRecognitionProvider.id,
      rawMetadata: {
        requestId: context.requestId,
        status,
        image,
        parsed,
        description,
      },
      ...(parsed.brand ? { brand: parsed.brand.trim() } : {}),
      ...(parsed.model ? { model: parsed.model.trim() } : {}),
      ...(parsed.category ? { category: parsed.category.trim() } : {}),
      ...(parsed.variant ? { variant: parsed.variant.trim() } : {}),
      ...(parsed.conditionNotes ? { conditionNotes: parsed.conditionNotes.trim() } : {}),
      ...(suggestedPricingQuery ? { suggestedPricingQuery } : {}),
    };
  },
};

async function getReadyStatus(): Promise<GeminiNanoStatus> {
  let status = await geminiNanoModule.getStatus();
  if (status.imageDescription === "downloadable" || status.imageDescription === "downloading") {
    status = await geminiNanoModule.warmup();
  }

  if (status.imageDescription !== "available") {
    throw new Error(
      `Gemini Nano image recognition is ${status.imageDescription}. Use an Android dev build on an AICore-capable device and retry after model download is available.`,
    );
  }

  return status;
}

async function parseIdentityWithGemini(description: string): Promise<ParsedIdentity> {
  const status = await geminiNanoModule.getStatus();
  if (status.prompt !== "available") {
    return {};
  }

  try {
    const response = await geminiNanoModule.prompt({
      text: [
        "Extract a resale search identity from this product photo description.",
        "Return only compact JSON with keys: objectName, brand, model, category, variant, conditionNotes, confidence, suggestedPricingQuery.",
        "Use null when unknown. Make suggestedPricingQuery a marketplace search phrase for used pricing.",
        `Description: ${description}`,
      ].join("\n"),
    });

    if (response.status !== "available") return {};
    return normalizeParsedIdentity(parseJsonObject(response.text));
  } catch {
    return {};
  }
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed;
  return JSON.parse(candidate) as unknown;
}

function normalizeParsedIdentity(value: unknown): ParsedIdentity {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;

  return {
    objectName: stringField(record.objectName),
    brand: stringField(record.brand),
    model: stringField(record.model),
    category: stringField(record.category),
    variant: stringField(record.variant),
    conditionNotes: stringField(record.conditionNotes),
    confidence: numberField(record.confidence),
    suggestedPricingQuery: stringField(record.suggestedPricingQuery),
  };
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "null"
    ? value.trim()
    : undefined;
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function summarizeDescription(description: string): string {
  return description
    .split(/[.!?\n]/)[0]
    ?.replace(/\b(the image|this image|the photo|this photo|appears to show|shows|contains)\b/gi, "")
    .trim()
    .slice(0, 96)
    || "Unknown item";
}

function buildSuggestedPricingQuery(parsed: ParsedIdentity, displayName: string, description: string): string {
  const explicitQuery = parsed.suggestedPricingQuery?.trim();
  if (explicitQuery) return explicitQuery;

  const structured = [parsed.brand, parsed.model, parsed.category ?? parsed.objectName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return `${structured || displayName || summarizeDescription(description)} used price`.trim();
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.68;
  if (value > 1) return Math.min(1, value / 100);
  return Math.max(0, Math.min(1, value));
}
