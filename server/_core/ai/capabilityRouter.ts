import type { AgentId, AITask, AIProviderName } from "./types";

export const PRODUCT_INTENTS = [
  "social_post",
  "facebook_reel",
  "instagram_reel",
  "tiktok_short",
  "youtube_short",
  "youtube_long_script",
  "linkedin_post",
  "google_business_update",
  "email_campaign",
  "image_ad",
  "avatar_video",
  "voiceover",
  "campaign_calendar",
  "platform_pack",
  "compliance_review",
  "growth_score",
] as const;

export type ProductIntent = (typeof PRODUCT_INTENTS)[number];

export type CapabilityStep = {
  id: "strategy" | "copywriting" | "script" | "image_prompt" | "media_generation" | "compliance" | "schedule";
  label: string;
  task: AITask;
  agentId: AgentId;
  fallback: string;
  outputShape: string;
};

export type CapabilityPlan = {
  intent: ProductIntent;
  primaryProvider: AIProviderName;
  fallbackProviders: AIProviderName[];
  mediaMode: "playable_if_ready" | "prompt_only" | "none";
  steps: CapabilityStep[];
};

const TEXT_PROVIDER_ORDER: AIProviderName[] = ["genx", "qwen", "huggingface"];

const BASE_STEPS: CapabilityStep[] = [
  {
    id: "strategy",
    label: "Strategist",
    task: "copywriting",
    agentId: "StrategyAgent",
    fallback: "Use structured campaign heuristics if provider output is unavailable.",
    outputShape: "strategy, audience angle, offer positioning",
  },
  {
    id: "copywriting",
    label: "Copywriter",
    task: "copywriting",
    agentId: "CopyAgent",
    fallback: "Use approved EquiProfile copy template.",
    outputShape: "hook, caption/body, CTA, hashtags",
  },
  {
    id: "script",
    label: "Creative Director",
    task: "copywriting",
    agentId: "CreativeDirectorAgent",
    fallback: "Create prompt-only visual direction and shot list.",
    outputShape: "script, shot list, visual direction, media brief",
  },
  {
    id: "compliance",
    label: "Compliance",
    task: "moderation",
    agentId: "ComplianceAgent",
    fallback: "Block unsafe claims and require manual approval.",
    outputShape: "compliance notes and approval guidance",
  },
  {
    id: "schedule",
    label: "Scheduler",
    task: "classification",
    agentId: "SchedulerAgent",
    fallback: "Recommend approval-first UK weekday scheduling window.",
    outputShape: "recommended schedule and next actions",
  },
];

function withMediaStep(steps: CapabilityStep[], task: AITask): CapabilityStep[] {
  return [
    ...steps.slice(0, 3),
    {
      id: "media_generation",
      label: "Media Agent",
      task,
      agentId: "MediaAgent",
      fallback: "Keep media as prompt/script-only until a playable provider passes diagnostics.",
      outputShape: "media prompt, provider job, stored asset when available",
    },
    ...steps.slice(3),
  ];
}

export function inferProductIntent(input: {
  platform?: string | null;
  format?: string | null;
  prompt?: string | null;
}): ProductIntent {
  const platform = (input.platform ?? "").toLowerCase();
  const format = (input.format ?? "").toLowerCase();
  const prompt = (input.prompt ?? "").toLowerCase();
  const text = `${platform} ${format} ${prompt}`;

  if (text.includes("platform pack") || text.includes("campaign pack")) return "platform_pack";
  if (text.includes("calendar") || text.includes("launch plan")) return "campaign_calendar";
  if (text.includes("email") || text.includes("newsletter")) return "email_campaign";
  if (text.includes("avatar")) return "avatar_video";
  if (text.includes("voiceover") || text.includes("voice over")) return "voiceover";
  if (text.includes("image") || text.includes("poster") || text.includes("graphic")) return "image_ad";
  if (text.includes("google business") || text.includes("gbp")) return "google_business_update";
  if (text.includes("linkedin")) return "linkedin_post";
  if (text.includes("youtube") && (text.includes("long") || text.includes("full video"))) return "youtube_long_script";
  if (text.includes("youtube")) return "youtube_short";
  if (text.includes("tiktok") || text.includes("tik tok")) return "tiktok_short";
  if (text.includes("instagram")) return "instagram_reel";
  if (text.includes("facebook") && (text.includes("reel") || text.includes("video") || text.includes("30-second"))) return "facebook_reel";
  if (text.includes("compliance")) return "compliance_review";
  if (text.includes("score")) return "growth_score";
  return "social_post";
}

export function getCapabilityPlan(intent: ProductIntent): CapabilityPlan {
  if (intent === "avatar_video") {
    return {
      intent,
      primaryProvider: "genx",
      fallbackProviders: TEXT_PROVIDER_ORDER.slice(1),
      mediaMode: "playable_if_ready",
      steps: withMediaStep(BASE_STEPS, "avatar_video"),
    };
  }
  if (["facebook_reel", "instagram_reel", "tiktok_short", "youtube_short"].includes(intent)) {
    return {
      intent,
      primaryProvider: "genx",
      fallbackProviders: TEXT_PROVIDER_ORDER.slice(1),
      mediaMode: "prompt_only",
      steps: withMediaStep(BASE_STEPS, "text_to_video"),
    };
  }
  if (intent === "image_ad") {
    return {
      intent,
      primaryProvider: "genx",
      fallbackProviders: TEXT_PROVIDER_ORDER.slice(1),
      mediaMode: "playable_if_ready",
      steps: withMediaStep(BASE_STEPS, "text_to_image"),
    };
  }
  if (intent === "voiceover") {
    return {
      intent,
      primaryProvider: "genx",
      fallbackProviders: TEXT_PROVIDER_ORDER.slice(1),
      mediaMode: "playable_if_ready",
      steps: withMediaStep(BASE_STEPS, "text_to_speech"),
    };
  }
  return {
    intent,
    primaryProvider: "genx",
    fallbackProviders: TEXT_PROVIDER_ORDER.slice(1),
    mediaMode: "none",
    steps: BASE_STEPS,
  };
}

export function getAgentTimelineForIntent(intent: ProductIntent) {
  return getCapabilityPlan(intent).steps.map((step, index) => ({
    order: index + 1,
    label: step.label,
    agentId: step.agentId,
    status: "ready" as const,
    purpose: step.outputShape,
    fallback: step.fallback,
  }));
}
