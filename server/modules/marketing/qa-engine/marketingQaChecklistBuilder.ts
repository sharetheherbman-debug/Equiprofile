import {
  hasBannedPhrase,
  hasEquineContext,
  hasOffTopicDrift,
  hasPlaceholderCopy,
  hasUnsupportedClaim,
} from "./marketingQaRules";
import type { MarketingQaChecklist, MarketingQaChecklistItem, MarketingReviewTargetType } from "./marketingQaTypes";

function check(key: string, label: string, passed: boolean, severity: "error" | "warning", reason?: string): MarketingQaChecklistItem {
  return { key, label, passed, severity, ...(reason ? { reason } : {}) };
}

function parseDurationTarget(input: Record<string, unknown>): number | null {
  if (typeof input.durationTargetSeconds === "number") return input.durationTargetSeconds;
  const metadata = input.metadata;
  if (metadata && typeof metadata === "object" && typeof (metadata as Record<string, unknown>).durationTargetSeconds === "number") {
    return (metadata as Record<string, number>).durationTargetSeconds;
  }
  return null;
}

const EQUINE_SCOPE_TERMS = ["equiprofile", "equine", "horse", "stable", "rider"];

function collectText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((entry) => collectText(entry)).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map((entry) => collectText(entry)).join(" ");
  }
  return "";
}

function includesEquineTerm(value: string): boolean {
  const lower = value.toLowerCase();
  return EQUINE_SCOPE_TERMS.some((term) => lower.includes(term));
}

export function shouldApplyEquineQa(input: {
  hostAppId?: string | null;
  content?: string;
  metadata?: Record<string, unknown>;
}): boolean {
  if (String(input.hostAppId ?? "").trim().toLowerCase() === "equiprofile") return true;
  if (includesEquineTerm(String(input.content ?? ""))) return true;
  return includesEquineTerm(collectText(input.metadata ?? {}));
}

export function buildMarketingQaChecklist(input: {
  hostAppId?: string | null;
  targetType: MarketingReviewTargetType;
  targetId: string;
  content?: string;
  platform?: string | null;
  brandTone?: string | null;
  cta?: string | null;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}): MarketingQaChecklist {
  const content = String(input.content ?? "");
  const platform = String(input.platform ?? "");
  const brandTone = String(input.brandTone ?? "");
  const cta = String(input.cta ?? "");
  const warnings = Array.isArray(input.warnings) ? input.warnings : [];
  const metadata = input.metadata ?? {};
  const items: MarketingQaChecklistItem[] = [];
  const equineQaApplies = shouldApplyEquineQa({
    hostAppId: input.hostAppId,
    content,
    metadata: {
      platform,
      brandTone,
      cta,
      ...metadata,
    },
  });

  if (input.targetType === "campaign_item") {
    items.push(
      check("copy_hook", "Has clear hook", /\bhook[:\s]/i.test(content) || content.length > 30, "warning"),
      check("copy_cta", "Has CTA", cta.length > 0 || /\b(call|book|start|learn|join|sign up)\b/i.test(content), "error"),
      check("copy_platform_fit", "Matches platform", platform.length > 0, "warning"),
      check("copy_brand_tone", "Matches brand tone", !brandTone || content.toLowerCase().includes(brandTone.toLowerCase().split(" ")[0] || ""), "warning"),
      check("copy_no_placeholder", "No placeholder copy", !hasPlaceholderCopy(content), "error", "Placeholder copy detected."),
      check("copy_no_banned", "No banned phrases", !hasBannedPhrase(content), "error"),
      check("copy_no_unsupported_claims", "No unsupported claims", !hasUnsupportedClaim(content), "error"),
    );
    if (equineQaApplies) {
      items.push(
        check("equine_context", "Horse/equine/stable context preserved", hasEquineContext(content), "error"),
        check("equine_no_drift", "No laptop/office/city/gibberish drift", !hasOffTopicDrift(content), "warning"),
        check("equine_audience", "Audience matches stable/horse owners", /stable|horse|equine|owner|rider/i.test(content), "warning"),
      );
    }
  } else {
    const sceneReviewCount = Number(metadata.needsReviewSceneCount ?? 0);
    const durationTargetSeconds = parseDurationTarget(metadata);
    const durationSeconds = typeof metadata.durationSeconds === "number" ? metadata.durationSeconds : null;
    items.push(
      check("render_brand_domain_cta", "Has brand/domain/CTA", Boolean(metadata.brandName || metadata.domain || cta), "error"),
      check("render_captions", "Has captions or caption fallback", Boolean(metadata.captionStatus) || content.toLowerCase().includes("caption"), "error"),
      check("render_scene_media_or_text_card", "Has scene media or intentional text-card fallback", Number(metadata.sceneCount ?? 0) > 0 || content.toLowerCase().includes("text_card"), "error"),
      check("render_warnings_reviewed", "Warnings reviewed", warnings.length === 0 || Boolean(metadata.warningsReviewed), "warning"),
      check("render_duration", "Duration matches target range", !durationTargetSeconds || !durationSeconds || Math.abs(durationTargetSeconds - durationSeconds) <= 5, "warning"),
      check("render_needs_review_ack", "needs_review scene count acknowledged", sceneReviewCount === 0 || Boolean(metadata.needsReviewAcknowledged), "warning"),
      check("render_no_provider_prompt_leak", "No raw provider prompt leaked", !/runway|pika|provider prompt|raw provider/i.test(content), "error"),
    );
    if (equineQaApplies) {
      items.push(
        check("equine_context", "Horse/equine/stable context preserved", hasEquineContext(content), "warning"),
        check("equine_no_drift", "No laptop/office/city/gibberish drift", !hasOffTopicDrift(content), "warning"),
        check("equine_audience", "Audience matches stable/horse owners", /stable|horse|equine|owner|rider/i.test(content), "warning"),
      );
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    targetType: input.targetType,
    targetId: input.targetId,
    items,
  };
}
