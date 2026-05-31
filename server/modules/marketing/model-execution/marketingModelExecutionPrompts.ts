import type { MarketingModelExecutionInput, MarketingModelTask } from "./marketingModelExecutionTypes";

function taskInstructions(task: MarketingModelTask): string {
  switch (task) {
    case "campaign_strategy":
      return "Create campaign strategy with goals, key messaging, channel emphasis, and measurable next steps.";
    case "hook_generation":
      return "Generate high-performing hooks with concise attention-grabbing phrasing.";
    case "angle_generation":
      return "Generate conversion-oriented creative angles aligned to campaign goal and audience.";
    case "platform_copywriting":
      return "Generate platform-ready copy with hook, body, CTA, hashtags, visual prompt, and angle.";
    case "scriptwriting":
      return "Generate short-form script with structured beats and CTA ending.";
    case "scene_planning":
      return "Generate scene plan with sequence, visual directions, narration cues, and CTA close.";
    case "prompt_direction":
      return "Generate creative prompt direction that improves visual consistency and relevance.";
    case "localization":
      return "Localize copy while preserving protected terms and links exactly.";
    case "cta_variants":
      return "Generate CTA variants with concise action-focused wording.";
    case "email_generation":
      return "Generate campaign-ready email with subject, preview, body, and CTA.";
    case "blog_seo_generation":
      return "Generate SEO-friendly blog outline, title candidates, and meta description.";
    case "qa_summary":
      return "Generate concise QA summary listing strengths, risks, and revision priorities.";
    default:
      return "Generate marketing output.";
  }
}

function requiredFieldsForTask(task: MarketingModelTask): string[] {
  switch (task) {
    case "platform_copywriting":
      return ["angle", "hook", "body", "cta", "hashtags", "visualPrompt", "reviewStatus"];
    case "localization":
      return ["hook", "body", "cta", "reviewStatus"];
    case "email_generation":
      return ["subject", "body", "cta", "reviewStatus"];
    case "blog_seo_generation":
      return ["title", "outline", "metaDescription", "reviewStatus"];
    default:
      return ["content", "reviewStatus"];
  }
}

export function buildMarketingModelPrompt(input: MarketingModelExecutionInput): { prompt: string; requiredFields: string[] } {
  const requiredFields = requiredFieldsForTask(input.task);
  const constraints = (input.constraints ?? []).filter(Boolean);
  const prompt = [
    `Task: ${input.task}`,
    `Mode: ${input.mode}`,
    `Brand: ${String(input.brandKit.brandName ?? "")}`,
    `Domain: ${String(input.brandKit.domain ?? "")}`,
    `Campaign: ${String(input.campaignBrief.campaignName ?? "")}`,
    `Goal: ${String(input.campaignBrief.goal ?? "")}`,
    `Audience: ${String(input.audience ?? input.campaignBrief.audience ?? "")}`,
    `Offer: ${String(input.offer ?? input.campaignBrief.offer ?? "")}`,
    `Platform: ${String(input.platform ?? "")}`,
    `Language: ${String(input.language ?? "English")}`,
    `Content type: ${String(input.contentType ?? "")}`,
    `Original prompt: ${String(input.originalPrompt ?? "")}`,
    constraints.length ? `Constraints: ${constraints.join(" | ")}` : "",
    `Instruction: ${taskInstructions(input.task)}`,
    "Output requirements:",
    `- Return valid JSON only with fields: ${requiredFields.join(", ")}`,
    "- Do not include markdown fences.",
    "- No empty strings for required text fields.",
    "- reviewStatus must be exactly 'needs_review'.",
  ].filter(Boolean).join("\n");
  return { prompt, requiredFields };
}
