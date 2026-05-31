import type { AIProviderName, AITask } from "../../../_core/ai/types";

export const MARKETING_PROVIDER_NAMES = ["genx", "qwen", "huggingface"] as const;
export type MarketingProviderName = (typeof MARKETING_PROVIDER_NAMES)[number];

export const MARKETING_MODEL_CATEGORIES = [
  "text",
  "image",
  "video",
  "voice",
  "audio",
  "vision",
  "embedding",
  "translation",
  "multimodal",
] as const;
export type MarketingModelCategory = (typeof MARKETING_MODEL_CATEGORIES)[number];

export const MARKETING_SETUP_STATUSES = ["ready", "setup_needed", "provider_unavailable", "disabled"] as const;
export type MarketingSetupStatus = (typeof MARKETING_SETUP_STATUSES)[number];

export const MARKETING_HEALTH_STATUSES = ["ok", "degraded", "failed", "setup_needed", "provider_unavailable"] as const;
export type MarketingHealthStatus = (typeof MARKETING_HEALTH_STATUSES)[number];

export const MARKETING_COST_TIERS = ["free", "budget", "standard", "premium", "elite", "unknown"] as const;
export type MarketingCostTier = (typeof MARKETING_COST_TIERS)[number];

export const MARKETING_QUALITY_TIERS = ["basic", "good", "premium", "elite", "unknown"] as const;
export type MarketingQualityTier = (typeof MARKETING_QUALITY_TIERS)[number];

export const MARKETING_TASKS = [
  "campaign_strategy",
  "hook_generation",
  "angle_generation",
  "platform_copywriting",
  "email_generation",
  "blog_seo_generation",
  "scriptwriting",
  "scene_planning",
  "prompt_direction",
  "localization",
  "captioning",
  "transcription",
  "voiceover",
  "image_generation",
  "text_to_video_scene_clip",
  "visual_qa",
  "embedding",
  "qa_summary",
  "avatar_generation",
  "avatar_lipsync",
  "music_generation",
  "background_audio_selection",
] as const;
export type MarketingTask = (typeof MARKETING_TASKS)[number];

export type WorkspaceBudgetPolicy = {
  mode: "standard" | "elite";
  maxCostTier: MarketingCostTier;
  maxVariantsPerRun: number;
  maxRenderJobsPerRun: number;
  maxVideoSecondsPerRun: number;
  allowPremiumVideo: boolean;
  allowPremiumVoice: boolean;
  allowPremiumAvatar: boolean;
  allowPremiumMusic: boolean;
  allowGenXFallbackInStandard: boolean;
  requireApprovalForPremiumSpend: boolean;
};

export type MarketingProviderModelRecord = {
  provider: MarketingProviderName;
  modelId: string;
  displayName: string;
  category: MarketingModelCategory;
  supportedTasks: MarketingTask[];
  inputModalities: string[];
  outputModalities: string[];
  maxContextTokens: number | null;
  maxDurationSeconds: number | null;
  supportedAspectRatios: string[];
  supportedLanguages: string[];
  costTier: MarketingCostTier;
  pricing: Record<string, unknown> | null;
  qualityTier: MarketingQualityTier;
  isAvailable: boolean;
  setupStatus: MarketingSetupStatus;
  source: "synced" | "manual" | "fallback";
  metadata: Record<string, unknown>;
  lastSyncedAt: string | null;
};

export type MarketingTaskCapabilityEntry = {
  task: MarketingTask;
  canonicalTask: AITask;
  routeType: "model" | "media_factory_assembled_video";
  requiredOutput: "text" | "image" | "video" | "voice" | "audio" | "vision" | "embedding";
  standardPreference: MarketingProviderName[];
  elitePreference: MarketingProviderName[];
  allowGenXFallbackInStandard: boolean;
};

export function asProvider(provider: AIProviderName): MarketingProviderName {
  return provider;
}
