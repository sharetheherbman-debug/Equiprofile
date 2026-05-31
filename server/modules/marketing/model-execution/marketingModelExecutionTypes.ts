import type { AIProviderName } from "../../../_core/ai";

export const MARKETING_MODEL_TASKS = [
  "campaign_strategy",
  "hook_generation",
  "angle_generation",
  "platform_copywriting",
  "scriptwriting",
  "scene_planning",
  "prompt_direction",
  "localization",
  "cta_variants",
  "email_generation",
  "blog_seo_generation",
  "qa_summary",
] as const;

export type MarketingModelTask = (typeof MARKETING_MODEL_TASKS)[number];
export type MarketingExecutionMode = "standard" | "elite";

export type MarketingExecutionStatus = "completed" | "setup_needed" | "provider_unavailable" | "failed" | "fallback";

export type MarketingExecutionGenerationMode = "model" | "fallback";

export type MarketingExecutionProviderStatus = "ready" | "provider_unavailable" | "setup_needed";

export type MarketingModelExecutionInput = {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  mode: MarketingExecutionMode;
  task: MarketingModelTask;
  brandKit: Record<string, unknown>;
  campaignBrief: Record<string, unknown>;
  platform?: string;
  language?: string;
  contentType?: string;
  audience?: string;
  offer?: string;
  originalPrompt?: string;
  constraints?: string[];
  providerHealthRegistry?: Array<{
    provider: AIProviderName;
    available: boolean;
    configured: boolean;
  }>;
};

export type MarketingModelExecutionRoute = {
  provider: AIProviderName | null;
  model: string | null;
  providerStatus: MarketingExecutionProviderStatus;
  routeReason: string;
  estimatedCostTier: "low" | "medium" | "high" | null;
};

export type MarketingModelExecutionOutput = {
  status: MarketingExecutionStatus;
  generationMode: MarketingExecutionGenerationMode;
  provider: AIProviderName | null;
  model: string | null;
  task: MarketingModelTask;
  mode: MarketingExecutionMode;
  routeReason: string;
  estimatedCostTier: "low" | "medium" | "high" | null;
  fallbackReason: string | null;
  generatedAt: string;
  output: Record<string, unknown>;
  rawText: string | null;
  warnings: string[];
  parserWarnings: string[];
  providerStatus: MarketingExecutionProviderStatus;
  reviewStatus: "needs_review";
};

export type MarketingRoutingSummary = {
  countsByProvider: Record<string, number>;
  countsByGenerationMode: Record<MarketingExecutionGenerationMode, number>;
  fallbackCount: number;
  failedOrSetupNeededCount: number;
  modeSummary: Record<MarketingExecutionMode, number>;
};
