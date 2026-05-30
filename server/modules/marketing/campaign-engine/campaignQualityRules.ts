import type { CampaignDeliverable } from "./campaignDeliverableTypes";

const FORBIDDEN_PLACEHOLDERS = ["manual posting copy", "lorem ipsum", "todo"];

export function defaultQualityChecks(): string[] {
  return [
    "copy_present",
    "hook_present",
    "cta_present",
    "platform_specific",
    "placeholder_free",
    "status_export_only_or_draft",
  ];
}

export function validateDeliverableQuality(deliverable: CampaignDeliverable): string[] {
  const failures: string[] = [];
  const fullText = `${deliverable.title} ${deliverable.body} ${deliverable.hook}`.toLowerCase();

  if (!deliverable.title.trim()) failures.push("title_missing");
  if (!deliverable.body.trim()) failures.push("body_missing");
  if (!deliverable.hook.trim()) failures.push("hook_missing");
  if (!deliverable.cta.trim()) failures.push("cta_missing");
  if (FORBIDDEN_PLACEHOLDERS.some((value) => fullText.includes(value))) failures.push("placeholder_detected");
  if (deliverable.status !== "export_only" && deliverable.status !== "draft") failures.push("invalid_status");

  return failures;
}
