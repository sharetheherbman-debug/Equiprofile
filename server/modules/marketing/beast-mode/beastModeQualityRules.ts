import type { BeastModeVariantDraft } from "./beastModeTypes";

export function validateBeastModeVariant(variant: BeastModeVariantDraft) {
  const issues: string[] = [];
  const combinedCopy = `${variant.hook} ${variant.body} ${variant.cta}`;
  if (!variant.platform) issues.push("platform_required");
  if (!variant.contentType) issues.push("content_type_required");
  if (!variant.hook.trim()) issues.push("hook_required");
  if (!variant.body.trim()) issues.push("body_required");
  if (!variant.cta.trim()) issues.push("cta_required");
  if (/manual posting copy/i.test(combinedCopy)) issues.push("manual_posting_copy_forbidden");
  if (/\b(placeholder|todo|tbd|replace_me)\b|\[placeholder\]/i.test(combinedCopy)) issues.push("placeholder_copy_forbidden");
  if (variant.studioPlan && variant.studioPlan.renderMode !== "assembled_video") issues.push("video_must_use_studio_plan");
  return issues;
}
