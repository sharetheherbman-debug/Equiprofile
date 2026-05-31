function extractJsonBlock(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }
  return null;
}

function normalizeOutput(output: Record<string, unknown>): Record<string, unknown> {
  const next = { ...output };
  if (Array.isArray(next.hashtags)) {
    next.hashtags = next.hashtags.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (Array.isArray(next.outline)) {
    next.outline = next.outline.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (next.reviewStatus !== "needs_review") {
    next.reviewStatus = "needs_review";
  }
  return next;
}

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

export function parseMarketingModelOutput(input: {
  rawText: string;
  requiredFields: string[];
}): { ok: true; output: Record<string, unknown>; parserWarnings: string[] } | { ok: false; parserWarnings: string[] } {
  const parserWarnings: string[] = [];
  const jsonBlock = extractJsonBlock(input.rawText);
  if (!jsonBlock) {
    parserWarnings.push("No JSON object found in provider response.");
    return { ok: false, parserWarnings };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonBlock) as Record<string, unknown>;
  } catch {
    parserWarnings.push("JSON parse failed for provider response.");
    return { ok: false, parserWarnings };
  }

  const normalized = normalizeOutput(parsed);
  const missing = input.requiredFields.filter((field) => !hasValue(normalized[field]));
  if (missing.length) {
    parserWarnings.push(`Missing required fields: ${missing.join(", ")}.`);
    return { ok: false, parserWarnings };
  }

  return { ok: true, output: normalized, parserWarnings };
}

export function parseMarketingModelObject(input: {
  object: Record<string, unknown>;
  requiredFields: string[];
}): { ok: true; output: Record<string, unknown>; parserWarnings: string[] } | { ok: false; parserWarnings: string[] } {
  const parserWarnings: string[] = [];
  const normalized = normalizeOutput(input.object);
  const missing = input.requiredFields.filter((field) => !hasValue(normalized[field]));
  if (missing.length) {
    parserWarnings.push(`Missing required fields: ${missing.join(", ")}.`);
    return { ok: false, parserWarnings };
  }
  return { ok: true, output: normalized, parserWarnings };
}
