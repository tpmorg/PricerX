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
    const objectName = sanitizeObjectName(parsed.objectName) || summarizeDescription(description);
    const identity = buildObjectIdentity({
      objectName,
      brand: sanitizeField(parsed.brand),
      model: sanitizeField(parsed.model),
      category: sanitizeField(parsed.category),
      variant: sanitizeField(parsed.variant),
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
      ...(sanitizeField(parsed.brand) ? { brand: sanitizeField(parsed.brand) } : {}),
      ...(sanitizeField(parsed.model) ? { model: sanitizeField(parsed.model) } : {}),
      ...(sanitizeField(parsed.category) ? { category: sanitizeField(parsed.category) } : {}),
      ...(sanitizeField(parsed.variant) ? { variant: sanitizeField(parsed.variant) } : {}),
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
        "Identify the main sellable item from this product photo description.",
        "Return only compact JSON with keys: objectName, brand, model, category, variant, conditionNotes, confidence, suggestedPricingQuery.",
        "objectName must be only the item name, ideally 2 to 6 words.",
        "Do not describe the scene, background, surface, colors, pose, or where the item is sitting.",
        "Do not return a sentence. Do not include phrases like 'on a desk', 'in a room', 'box for', or 'appears to be'.",
        "Use null when unknown. Make suggestedPricingQuery a concise marketplace search phrase for used pricing.",
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
  return sanitizeObjectName(
    description
      .split(/[.!?\n]/)[0]
      ?.replace(/\b(the image|this image|the photo|this photo|appears to show|shows|contains)\b/gi, "")
      .trim(),
  ) || "Unknown item";
}

function buildSuggestedPricingQuery(parsed: ParsedIdentity, displayName: string, description: string): string {
  const explicitQuery = parsed.suggestedPricingQuery?.trim();
  if (explicitQuery) return explicitQuery;

  const structured = [
    sanitizeField(parsed.brand),
    sanitizeField(parsed.model),
    sanitizeField(parsed.category) ?? sanitizeObjectName(parsed.objectName),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return `${structured || displayName || summarizeDescription(description)} used price`.trim();
}

function sanitizeField(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function sanitizeObjectName(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const cleaned = value
    .replace(/\b(appears to be|appears to show|looks like|seems to be|sits on|lying on|on a|on an|on the|in a|in an|in the)\b.*$/i, "")
    .replace(/\b(a|an|the)\b\s+/i, "")
    .replace(/\b(box for|package for|packaging for)\b\s*/i, "")
    .replace(/[.,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return undefined;
  if (cleaned.length > 80) return cleaned.slice(0, 80).trim();
  return cleaned;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.68;
  if (value > 1) return Math.min(1, value / 100);
  return Math.max(0, Math.min(1, value));
}
