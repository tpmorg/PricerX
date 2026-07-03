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

    const parsed = await parseIdentityWithGemini(description, input.ocrText, input.hints?.userText);
    const brand = sanitizeBrand(parsed.brand);
    const model = sanitizeModel(parsed.model);
    const category = sanitizeCategory(parsed.category);
    const variant = sanitizeField(parsed.variant);
    const objectName = sanitizeObjectName(parsed.objectName) || summarizeDescription(description);
    const identity = buildObjectIdentity({
      objectName,
      brand,
      model,
      category,
      variant,
    });
    const suggestedPricingQuery = buildSuggestedPricingQuery(
      {
        ...parsed,
        brand,
        model,
        category,
        variant,
        objectName,
      },
      identity.displayName,
      description,
    );

    logRecognitionDebug({
      requestId: context.requestId,
      description,
      objectName,
      brand: identity.brand,
      model: identity.model,
      category: identity.category,
      variant: identity.variant,
      suggestedPricingQuery,
    });

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
      ...(brand ? { brand } : {}),
      ...(model ? { model } : {}),
      ...(category ? { category } : {}),
      ...(variant ? { variant } : {}),
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

async function parseIdentityWithGemini(
  description: string,
  ocrText?: string,
  userHint?: string,
): Promise<ParsedIdentity> {
  const status = await geminiNanoModule.getStatus();
  if (status.prompt !== "available") {
    return {};
  }

  try {
    const compactOcrText = sanitizePromptContext(ocrText);
    const compactUserHint = sanitizePromptContext(userHint);
    const response = await geminiNanoModule.prompt({
      text: [
        "Identify the main sellable item from this product photo description.",
        "Return only compact JSON with keys: objectName, brand, model, category, variant, conditionNotes, confidence, suggestedPricingQuery.",
        "objectName must be a bare product title, ideally brand plus model, maximum 5 words.",
        "brand must be only the manufacturer name. model must be only the model name or number.",
        "Do not describe the scene, background, surface, colors, pose, or where the item is sitting.",
        "Do not return a sentence. Never include verbs or phrases like 'is shown', 'on a desk', 'in a room', 'box for', 'original packaging', or 'appears to be'.",
        "Use null when unknown. Make suggestedPricingQuery a concise marketplace search phrase for used pricing, ideally brand plus model only.",
        `Description: ${description}`,
        compactOcrText ? `Visible text/OCR: ${compactOcrText}` : null,
        compactUserHint ? `User hint: ${compactUserHint}` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join("\n"),
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
  const firstSentence = description
    .split(/[.!?\n]/)[0]
    ?.replace(/\b(the image|this image|the photo|this photo|appears to show|shows|contains)\b/gi, "")
    .trim();

  const labeledText = extractLabeledText(firstSentence);
  if (labeledText) {
    return `${labeledText} pedal`;
  }

  return sanitizeObjectName(firstSentence) || "Unknown item";
}

function buildSuggestedPricingQuery(parsed: ParsedIdentity, displayName: string, description: string): string {
  const explicitQuery = sanitizeSearchPhrase(parsed.suggestedPricingQuery);
  const structuredQuery = sanitizeSearchPhrase(
    [
      parsed.brand,
      parsed.model,
      chooseSearchNoun(parsed.category, parsed.objectName),
    ]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  );
  const compactObjectName = sanitizeSearchPhrase(parsed.objectName);
  const compactDisplayName = sanitizeSearchPhrase(displayName);
  const compactSummary = sanitizeSearchPhrase(summarizeDescription(description));

  return explicitQuery || structuredQuery || compactObjectName || compactDisplayName || compactSummary || "used item";
}

function sanitizeField(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function sanitizeBrand(value: string | undefined): string | undefined {
  const cleaned = sanitizeCompactProductPhrase(value, 3);
  if (!cleaned) return undefined;
  if (looksDescriptive(cleaned)) return undefined;
  return cleaned;
}

function sanitizeModel(value: string | undefined): string | undefined {
  const cleaned = sanitizeCompactProductPhrase(value, 4);
  if (!cleaned) return undefined;
  if (looksDescriptive(cleaned)) return undefined;
  return cleaned;
}

function sanitizeCategory(value: string | undefined): string | undefined {
  const cleaned = sanitizeCompactProductPhrase(value, 3);
  if (!cleaned) return undefined;
  if (looksDescriptive(cleaned)) return undefined;
  return cleaned;
}

function sanitizeObjectName(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const cleaned = value
    .replace(/\b(appears to be|appears to show|looks like|seems to be|sits on|lying on|on a|on an|on the|in a|in an|in the)\b.*$/i, "")
    .replace(/\b(is shown|is pictured|is displayed|is sitting|is lying|shown in|pictured in)\b.*$/i, "")
    .replace(/\b(with|in)\s+(its|the)?\s*original packaging\b.*$/i, "")
    .replace(/\b(in|with)\s+original box\b.*$/i, "")
    .replace(/\b(small|large|tiny|compact|rectangular|square|black|white|red|blue|green|silver|gray|grey|brown|orange|yellow|gold|purple|pink)\b/gi, " ")
    .replace(/\b(labeled|labelled)\b/gi, " ")
    .replace(/\b(a|an|the)\b\s+/i, "")
    .replace(/\b(box for|package for|packaging for)\b\s*/i, "")
    .replace(/\bbox\b/gi, " ")
    .replace(/\bby\s+[a-z0-9&.' -]+$/i, "")
    .replace(/^(black|white|red|blue|green|silver|gray|grey|brown|orange|yellow|gold|purple|pink)\s+(and\s+(black|white|red|blue|green|silver|gray|grey|brown|orange|yellow|gold|purple|pink)\s+)?/i, "")
    .replace(/[.,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return sanitizeCompactProductPhrase(cleaned, 6);
}

function sanitizeSearchPhrase(value: string | undefined): string | undefined {
  const cleaned = sanitizeObjectName(value);
  if (!cleaned) return undefined;

  const labeledText = extractLabeledText(value);
  if (labeledText) {
    return `${labeledText} pedal`;
  }

  const normalized = cleaned
    .replace(/\bused price|new price|sold price|market value|resale value|for sale\b/gi, "")
    .replace(/\b(photo|image|desk|table|surface|background|room|box|packaging|shown|pictured|displayed)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || looksDescriptive(normalized)) return undefined;
  return normalized;
}

function chooseSearchNoun(category: string | undefined, objectName: string | undefined): string | undefined {
  const compactObjectName = sanitizeSearchPhrase(objectName);
  if (compactObjectName && containsMarketplaceNoun(compactObjectName)) {
    return compactObjectName;
  }

  const compactCategory = sanitizeSearchPhrase(category);
  return compactCategory;
}

function containsMarketplaceNoun(value: string): boolean {
  return /\b(pedal|guitar|bass|amp|amplifier|synth|keyboard|mixer|speaker|microphone|drum|controller|interface|monitor|rack|module)\b/i.test(
    value,
  );
}

function looksDescriptive(value: string): boolean {
  return /\b(sits|sitting|lying|desk|table|surface|background|room|photo|image|appears|shows|contains|shown|pictured|displayed|packaging)\b/i.test(
    value,
  );
}

function extractLabeledText(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const quoted = value.match(/["“”']([A-Za-z0-9][A-Za-z0-9 .\-_/]{1,24})["“”']/)?.[1]?.trim();
  if (quoted) return quoted.toUpperCase() === quoted ? quoted : quoted;

  const labeled = value.match(/\b(?:labeled|labelled)\s+["“”']?([A-Za-z0-9][A-Za-z0-9 .\-_/]{1,24})["“”']?/i)?.[1]?.trim();
  if (labeled) return labeled.toUpperCase() === labeled ? labeled : labeled;

  return undefined;
}

function sanitizePromptContext(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > 160 ? cleaned.slice(0, 160).trim() : cleaned;
}

function sanitizeCompactProductPhrase(value: string | undefined, maxTokens: number): string | undefined {
  const cleaned = sanitizeField(value);
  if (!cleaned) return undefined;

  const tokens = cleaned
    .replace(/[.,;:()]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return undefined;

  const truncated: string[] = [];
  for (const token of tokens) {
    if (isProductPhraseStopToken(token)) break;
    truncated.push(token);
    if (truncated.length >= maxTokens) break;
  }

  const joined = truncated.join(" ").trim();
  if (!joined) return undefined;

  const prioritized = prioritizeModelToken(joined, maxTokens);
  return prioritized.length > 80 ? prioritized.slice(0, 80).trim() : prioritized;
}

function isProductPhraseStopToken(token: string): boolean {
  return /^(is|shown|pictured|displayed|sitting|lying|with|inside|original|packaging|package|boxed|box|case|shown|photo|image)$/i.test(
    token,
  );
}

function prioritizeModelToken(value: string, maxTokens: number): string {
  const tokens = value.split(/\s+/).filter(Boolean);
  const modelIndex = tokens.findIndex((token) => looksLikeModelToken(token));
  if (modelIndex <= 0 || tokens.length <= maxTokens) {
    return tokens.slice(0, maxTokens).join(" ").trim();
  }

  const start = Math.max(0, modelIndex - Math.min(2, maxTokens - 1));
  return tokens.slice(start, start + maxTokens).join(" ").trim();
}

function looksLikeModelToken(value: string): boolean {
  return /^(?:[A-Z]{1,6}-?\d{1,4}[A-Z]{0,3}|\d{1,4}[A-Z]{1,6}|[A-Z]{1,4}\d[A-Z0-9-]{1,8})$/i.test(value);
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.68;
  if (value > 1) return Math.min(1, value / 100);
  return Math.max(0, Math.min(1, value));
}

function logRecognitionDebug(input: {
  requestId: string;
  description: string;
  objectName: string;
  brand?: string;
  model?: string;
  category?: string;
  variant?: string;
  suggestedPricingQuery: string;
}) {
  if (typeof __DEV__ !== "undefined" && !__DEV__) return;

  console.info("[recognition] Gemini Nano result", {
    requestId: input.requestId,
    objectName: input.objectName,
    brand: input.brand,
    model: input.model,
    category: input.category,
    variant: input.variant,
    suggestedPricingQuery: input.suggestedPricingQuery,
    description: input.description,
  });
}
