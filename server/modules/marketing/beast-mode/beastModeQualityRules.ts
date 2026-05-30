import type { BeastModeVariantDraft } from "./beastModeTypes";

export function validateBeastModeVariant(variant: BeastModeVariantDraft) {
  const issues: string[] = [];
  if (!variant.platform) issues.push("platform_required");
  if (!variant.contentType) issues.push("content_type_required");
  if (!variant.hook.trim()) issues.push("hook_required");
  if (!variant.body.trim()) issues.push("body_required");
  if (!variant.cta.trim()) issues.push("cta_required");
  if (/manual posting copy/i.test(`${variant.hook} ${variant.body} ${variant.cta}`)) issues.push("manual_posting_copy_forbidden");
  if (/placeholder/i.test(`${variant.hook} ${variant.body}`)) issues.push("placeholder_copy_forbidden");
  if (variant.studioPlan && variant.studioPlan.renderMode !== "assembled_video") issues.push("video_must_use_studio_plan");
  return issues;
}
