import type { MarketingContentType, MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";
import type { MarketingBrandKitRecord } from "../brand-kit";
import type { MarketingReviewStatus } from "../qa-engine";
import type { CampaignPlatform, CampaignSourceRecord } from "../campaign-engine";

export const BEAST_MODE_MODES = ["standard", "elite"] as const;
export type BeastModeMode = (typeof BEAST_MODE_MODES)[number];

export const BEAST_MODE_STATUSES = ["draft", "queued", "processing", "completed", "failed", "cancelled"] as const;
export type BeastModeStatus = (typeof BEAST_MODE_STATUSES)[number];

export const BEAST_MODE_TASKS = [
  "strategy",
  "copywriting",
  "hook_generation",
  "translation",
  "scriptwriting",
  "scene_planning",
  "prompt_direction",
  "captioning",
  "qa_summary",
] as const;
export type BeastModeTask = (typeof BEAST_MODE_TASKS)[number];

export const BEAST_MODE_LANGUAGES = [
  "English",
  "Afrikaans",
  "Zulu",
  "French",
  "Spanish",
  "German",
  "Portuguese",
] as const;
export type BeastModeLanguage = (typeof BEAST_MODE_LANGUAGES)[number];

export type BeastModeCostTier = "low" | "medium" | "high";
export type BeastModeProvider = "qwen" | "huggingface" | "genx";
export type BeastModeRoutingStatus = "ready" | "setup_needed" | "provider_unavailable";

export interface BeastModeProviderHealth {
  provider: BeastModeProvider;
  available: boolean;
  configured: boolean;
  supportsLanguages?: string[];
  supportsTasks?: BeastModeTask[];
}

export interface BeastModeModelRoute {
  status: BeastModeRoutingStatus;
  provider: BeastModeProvider | null;
  model: string | null;
  routeReason: string;
  fallbackProviders: BeastModeProvider[];
  estimatedCostTier: BeastModeCostTier;
  capabilityWarnings: string[];
}

export interface BeastModeBrief {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  campaignId: number | null;
  brandKitId: number | null;
  campaignName: string;
  goal: string;
  audience: string;
  offer: string;
  primaryCta: string;
  mode: BeastModeMode;
  requestedVariantCount: number;
  requestedPlatforms: CampaignPlatform[];
  requestedLanguages: BeastModeLanguage[];
  brandSummary: Pick<MarketingBrandKitRecord, "brandName" | "domain" | "toneOfVoice" | "primaryColor" | "secondaryColor" | "logoUrl" | "overlayTemplate">;
  productNames: string[];
  generatedAt: string;
}

export interface BeastModeRunPlanItem {
  platform: CampaignPlatform;
  contentType: BeastModeVariantContentType;
  language: BeastModeLanguage;
  variantIndex: number;
}

export interface BeastModeRunPlan {
  distribution: BeastModeRunPlanItem[];
  batchRenderLimit: number;
  batchRenderRequested: boolean;
  routingSummary: Record<string, BeastModeModelRoute>;
}

export type BeastModeVariantContentType =
  | "facebook_ad"
  | "instagram_reel"
  | "tiktok_script"
  | "linkedin_post"
  | "youtube_short"
  | "youtube_3min_outline"
  | "email_sequence"
  | "blog_seo_outline";

export interface BeastModeVariantDraft {
  platform: CampaignPlatform;
  contentType: BeastModeVariantContentType;
  language: BeastModeLanguage;
  angle: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  visualPrompt: string;
  studioPlan: MarketingStudioPlan | null;
  metadata: Record<string, unknown>;
}

export interface BeastModeRunRecord {
  id: number;
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  campaignId: number | null;
  brandKitId: number | null;
  name: string;
  goal: string;
  audience: string;
  mode: BeastModeMode;
  requestedVariantCount: number;
  requestedLanguages: BeastModeLanguage[];
  requestedPlatforms: CampaignPlatform[];
  status: BeastModeStatus;
  plan: Record<string, unknown>;
  summary: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface BeastModeVariantRecord {
  id: number;
  runId: number;
  tenantId: string;
  workspaceId: string;
  campaignId: number | null;
  campaignItemId: number | null;
  platform: CampaignPlatform;
  contentType: BeastModeVariantContentType;
  language: BeastModeLanguage;
  angle: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  visualPrompt: string;
  studioPlan: MarketingStudioPlan | null;
  renderJobId: number | null;
  mediaAssetId: number | null;
  reviewStatus: MarketingReviewStatus;
  exportStatus: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BeastModeBuildInput {
  campaign: CampaignSourceRecord;
  brandKit: MarketingBrandKitRecord;
  mode: BeastModeMode;
  requestedVariantCount: number;
  requestedPlatforms: CampaignPlatform[];
  requestedLanguages: BeastModeLanguage[];
}
