import type { AgentId, AITask, AIProviderName } from "./types";
import { categoryForTask, resolveProviderSelectionForTask } from "./providerCapabilities";

export const PRODUCT_INTENTS = [
  "social_post",
  "facebook_reel",
  "instagram_reel",
  "tiktok_short",
  "youtube_short",
  "youtube_long",
  "linkedin_post",
  "google_business_update",
  "email_campaign",
  "blog_post",
  "carousel_post",
  "ad_campaign",
  "launch_campaign",
  "platform_pack",
  "avatar_video",
  "talking_head_video",
  "voiceover_ad",
  "product_ad",
  "educational_content",
  "stable_marketing",
  "school_marketing",
  "academy_marketing",
] as const;

export type ProductIntent = (typeof PRODUCT_INTENTS)[number];

type IntentPreviewType = "social" | "video" | "email" | "blog" | "carousel" | "ad" | "campaign";
type IntentMediaType = "none" | "image" | "video" | "avatar" | "audio" | "mixed";

export type CapabilityStep = {
  id:
    | "strategy"
    | "copywriting"
    | "script"
    | "storyboard"
    | "caption"
    | "hashtags"
    | "media_generation"
    | "platform_optimization"
    | "compliance"
    | "schedule"
    | "analytics";
  label: string;
  task: AITask;
  agentId: AgentId;
  fallback: string;
  outputShape: string;
};

export type IntentDefinition = {
  intent: ProductIntent;
  requiredTasks: AITask[];
  requiredMedia: IntentMediaType;
  requiredPreviewType: IntentPreviewType;
  requiredAgentChain: AgentId[];
  requiredPlatformOptimization: string[];
  requiredComplianceChecks: string[];
};

export type CapabilityPlan = IntentDefinition & {
  primaryProvider: AIProviderName;
  primaryModel: string | null;
  fallbackProviders: AIProviderName[];
  mediaMode: "playable_if_ready" | "prompt_only" | "none";
  steps: CapabilityStep[];
};

const DEFAULT_AGENT_CHAIN: AgentId[] = [
  "StrategyAgent",
  "CopyAgent",
  "CreativeDirectorAgent",
  "MediaAgent",
  "PlatformIntelligenceAgent",
  "ComplianceAgent",
  "SchedulerAgent",
  "AnalyticsAgent" as AgentId,
];

const DEFAULT_COMPLIANCE = [
  "no_fake_claims",
  "medical_claim_guard",
  "endorsement_guard",
  "autopublish_guard",
];

const INTENT_DEFINITIONS: Record<ProductIntent, IntentDefinition> = {
  social_post: {
    intent: "social_post",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "none",
    requiredPreviewType: "social",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["hook", "readability", "cta"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  facebook_reel: {
    intent: "facebook_reel",
    requiredTasks: ["copywriting", "text_to_video", "moderation", "classification"],
    requiredMedia: "video",
    requiredPreviewType: "video",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["first_3s_hook", "mobile_captions", "cta_close"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  instagram_reel: {
    intent: "instagram_reel",
    requiredTasks: ["copywriting", "text_to_video", "moderation", "classification"],
    requiredMedia: "video",
    requiredPreviewType: "video",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["first_2s_hook", "caption_spacing", "hashtag_mix"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  tiktok_short: {
    intent: "tiktok_short",
    requiredTasks: ["copywriting", "text_to_video", "moderation", "classification"],
    requiredMedia: "video",
    requiredPreviewType: "video",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["pattern_interrupt", "native_tone", "retention_loop"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  youtube_short: {
    intent: "youtube_short",
    requiredTasks: ["copywriting", "text_to_video", "moderation", "classification"],
    requiredMedia: "video",
    requiredPreviewType: "video",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["title_thumbnail_alignment", "retention_curve", "seo_tags"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  youtube_long: {
    intent: "youtube_long",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "mixed",
    requiredPreviewType: "blog",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["chaptering", "seo_description", "viewer_intent"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  linkedin_post: {
    intent: "linkedin_post",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "image",
    requiredPreviewType: "social",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["professional_voice", "authority_signal", "comment_cta"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  google_business_update: {
    intent: "google_business_update",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "image",
    requiredPreviewType: "social",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["local_keywords", "offer_clarity", "hours_notice"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  email_campaign: {
    intent: "email_campaign",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "none",
    requiredPreviewType: "email",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["subject_line", "preview_text", "deliverability_safe_copy"],
    requiredComplianceChecks: [...DEFAULT_COMPLIANCE, "gdpr_guard"],
  },
  blog_post: {
    intent: "blog_post",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "image",
    requiredPreviewType: "blog",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["seo_structure", "readability", "schema_opportunity"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  carousel_post: {
    intent: "carousel_post",
    requiredTasks: ["copywriting", "text_to_image", "moderation", "classification"],
    requiredMedia: "image",
    requiredPreviewType: "carousel",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["slide_narrative", "swipe_cta", "visual_consistency"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  ad_campaign: {
    intent: "ad_campaign",
    requiredTasks: ["copywriting", "text_to_image", "moderation", "classification"],
    requiredMedia: "mixed",
    requiredPreviewType: "ad",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["offer_clarity", "creative_testing", "audience_fit"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  launch_campaign: {
    intent: "launch_campaign",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "mixed",
    requiredPreviewType: "campaign",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["multi_channel_sequence", "timing_stagger", "campaign_goal_alignment"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  platform_pack: {
    intent: "platform_pack",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "mixed",
    requiredPreviewType: "campaign",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["cross_platform_adaptation", "tone_consistency", "format_alignment"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  avatar_video: {
    intent: "avatar_video",
    requiredTasks: ["copywriting", "avatar_video", "text_to_speech", "moderation", "classification"],
    requiredMedia: "avatar",
    requiredPreviewType: "video",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["presenter_consistency", "voice_persona", "cta_close"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  talking_head_video: {
    intent: "talking_head_video",
    requiredTasks: ["copywriting", "avatar_video", "moderation", "classification"],
    requiredMedia: "avatar",
    requiredPreviewType: "video",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["spoken_clarity", "cadence", "retention_structure"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  voiceover_ad: {
    intent: "voiceover_ad",
    requiredTasks: ["copywriting", "text_to_speech", "moderation", "classification"],
    requiredMedia: "audio",
    requiredPreviewType: "ad",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["voice_hook", "audio_cta", "script_timing"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  product_ad: {
    intent: "product_ad",
    requiredTasks: ["copywriting", "text_to_image", "moderation", "classification"],
    requiredMedia: "image",
    requiredPreviewType: "ad",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["benefit_first", "offer_signal", "social_proof"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  educational_content: {
    intent: "educational_content",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "mixed",
    requiredPreviewType: "social",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["clarity", "teaching_flow", "save_share_prompt"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  stable_marketing: {
    intent: "stable_marketing",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "mixed",
    requiredPreviewType: "campaign",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["stable_owner_positioning", "local_trust", "service_cta"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  school_marketing: {
    intent: "school_marketing",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "mixed",
    requiredPreviewType: "campaign",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["enrolment_positioning", "parent_trust", "intake_cta"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
  academy_marketing: {
    intent: "academy_marketing",
    requiredTasks: ["copywriting", "classification", "moderation"],
    requiredMedia: "mixed",
    requiredPreviewType: "campaign",
    requiredAgentChain: DEFAULT_AGENT_CHAIN,
    requiredPlatformOptimization: ["curriculum_positioning", "outcome_clarity", "application_cta"],
    requiredComplianceChecks: DEFAULT_COMPLIANCE,
  },
};

function stepForTask(task: AITask): CapabilityStep[] {
  const category = categoryForTask(task);
  switch (task) {
    case "copywriting":
      return [
        {
          id: "copywriting",
          label: "Copywriter",
          task,
          agentId: "CopyAgent",
          fallback: "Use approved campaign copy template.",
          outputShape: "hook, script, caption, CTA, hashtags",
        },
      ];
    case "text_to_image":
    case "image_edit":
    case "text_to_video":
    case "image_to_video":
    case "avatar_video":
    case "text_to_speech":
      return [
        {
          id: "media_generation",
          label: "Media",
          task,
          agentId: "MediaAgent",
          fallback: "Keep truthful storyboard/script output if playable media is unavailable.",
          outputShape: "media prompt, provider job, playable asset if available",
        },
      ];
    case "moderation":
      return [
        {
          id: "compliance",
          label: "Compliance",
          task,
          agentId: "ComplianceAgent",
          fallback: "Require approval before publish.",
          outputShape: "policy checks, risk notes, approval guidance",
        },
      ];
    case "classification":
      return [
        {
          id: "schedule",
          label: "Scheduler",
          task,
          agentId: "SchedulerAgent",
          fallback: "Recommend approval-first scheduling windows.",
          outputShape: "platform optimization and schedule recommendation",
        },
      ];
    default:
      return [
        {
          id: "analytics",
          label: "Analytics",
          task,
          agentId: "LearningAgent",
          fallback: "Use baseline historical campaign heuristics.",
          outputShape: `${category} outputs`,
        },
      ];
  }
}

function uniqueSteps(steps: CapabilityStep[]) {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = `${step.id}:${step.task}:${step.agentId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function inferProductIntent(input: {
  platform?: string | null;
  format?: string | null;
  prompt?: string | null;
}): ProductIntent {
  const text = `${input.platform ?? ""} ${input.format ?? ""} ${input.prompt ?? ""}`.toLowerCase();

  if (text.includes("launch campaign") || text.includes("launch plan")) return "launch_campaign";
  if (text.includes("platform pack")) return "platform_pack";
  if (text.includes("product ad")) return "product_ad";
  if (text.includes("voiceover") || text.includes("voice over")) return "voiceover_ad";
  if (text.includes("talking head")) return "talking_head_video";
  if (text.includes("avatar")) return "avatar_video";
  if (text.includes("carousel")) return "carousel_post";
  if (text.includes("blog")) return "blog_post";
  if (text.includes("email")) return "email_campaign";
  if (text.includes("google business") || text.includes("gbp")) return "google_business_update";
  if (text.includes("linkedin")) return "linkedin_post";
  if (text.includes("youtube") && (text.includes("long") || text.includes("10 minute"))) return "youtube_long";
  if (text.includes("youtube")) return "youtube_short";
  if (text.includes("tiktok") || text.includes("tik tok")) return "tiktok_short";
  if (text.includes("instagram")) return "instagram_reel";
  if (text.includes("facebook") && (text.includes("reel") || text.includes("30-second") || text.includes("30 second"))) return "facebook_reel";
  if (text.includes("ad campaign")) return "ad_campaign";
  if (text.includes("educational")) return "educational_content";
  if (text.includes("academy")) return "academy_marketing";
  if (text.includes("riding school") || text.includes("school marketing")) return "school_marketing";
  if (text.includes("stable marketing") || text.includes("stable owners")) return "stable_marketing";

  return "social_post";
}

export async function getCapabilityPlan(intent: ProductIntent): Promise<CapabilityPlan> {
  const definition = INTENT_DEFINITIONS[intent] ?? INTENT_DEFINITIONS.social_post;
  const copywritingSelection = await resolveProviderSelectionForTask("copywriting");

  const mediaMode =
    definition.requiredMedia === "none"
      ? "none"
      : definition.requiredMedia === "video" || definition.requiredMedia === "avatar" || definition.requiredMedia === "audio"
        ? "playable_if_ready"
        : "prompt_only";

  const orderedSteps = uniqueSteps([
    {
      id: "strategy",
      label: "Strategist",
      task: "copywriting",
      agentId: "StrategyAgent",
      fallback: "Use campaign strategy heuristics from template registry.",
      outputShape: "strategy, audience angle, offer positioning",
    },
    {
      id: "script",
      label: "Creative Director",
      task: "copywriting",
      agentId: "CreativeDirectorAgent",
      fallback: "Generate storyboard and shot list in text when media is unavailable.",
      outputShape: "script, shot list, visual direction",
    },
    ...definition.requiredTasks.flatMap(stepForTask),
    {
      id: "platform_optimization",
      label: "Platform Intelligence",
      task: "classification",
      agentId: "PlatformIntelligenceAgent",
      fallback: "Use default platform optimization rules.",
      outputShape: "platform-specific optimizations",
    },
  ]);

  return {
    ...definition,
    primaryProvider: copywritingSelection.primaryProvider,
    primaryModel: copywritingSelection.primaryModel,
    fallbackProviders: copywritingSelection.fallbackProviders,
    mediaMode,
    steps: orderedSteps,
  };
}

export async function getAgentTimelineForIntent(intent: ProductIntent) {
  const plan = await getCapabilityPlan(intent);
  return plan.steps.map((step, index) => ({
    order: index + 1,
    label: step.label,
    agentId: step.agentId,
    status: "ready" as const,
    purpose: step.outputShape,
    fallback: step.fallback,
  }));
}

export function getIntentDefinition(intent: ProductIntent): IntentDefinition {
  return INTENT_DEFINITIONS[intent] ?? INTENT_DEFINITIONS.social_post;
}
