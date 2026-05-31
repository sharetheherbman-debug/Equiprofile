import { executeMarketingModelTask, buildMarketingRouteMetadata } from "../model-execution";
import type {
  BeastModeBrief,
  BeastModeLanguage,
  BeastModeMode,
  BeastModeProviderHealth,
  BeastModeTask,
  BeastModeVariantContentType,
  BeastModeVariantDraft,
} from "./beastModeTypes";
import type { CampaignPlatform } from "../campaign-engine";

export interface BeastModeExecutionInput {
  task: BeastModeTask;
  mode: BeastModeMode;
  brief: BeastModeBrief;
  platform: CampaignPlatform;
  contentType: BeastModeVariantContentType;
  language: BeastModeLanguage;
  variantIndex: number;
  providerHealthRegistry?: BeastModeProviderHealth[];
}

export interface BeastModeExecutionOutput {
  generationMode: "model" | "fallback";
  provider: string | null;
  model: string | null;
  selectedProvider: string | null;
  selectedModel: string | null;
  executedProvider: string | null;
  executedModel: string | null;
  routeEnforced: boolean;
  routeMismatchReason: string | null;
  task: BeastModeTask;
  mode: BeastModeMode;
  routeReason: string;
  fallbackReason: string | null;
  estimatedCostTier: string;
  generatedAt: string;
  status: "completed" | "fallback" | "provider_unavailable" | "setup_needed" | "failed";
  parserWarnings: string[];
  providerStatus: "ready" | "provider_unavailable" | "setup_needed";
  copy: {
    angle: string;
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
    visualPrompt: string;
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 6);
}

function normalizeCopy(output: Record<string, unknown>, input: BeastModeExecutionInput) {
  const fallbackHook = `${input.brief.brandSummary.brandName} helps ${input.brief.audience} unlock ${input.brief.goal}.`;
  return {
    angle: asString(output.angle, `${input.platform}: ${input.brief.goal}`),
    hook: asString(output.hook, fallbackHook),
    body: asString(output.body, `${input.contentType} variant for ${input.brief.campaignName}.`),
    cta: asString(output.cta, input.brief.primaryCta),
    hashtags: asTags(output.hashtags),
    visualPrompt: asString(output.visualPrompt, `${input.platform} creative for ${input.brief.brandSummary.brandName}`),
  };
}

export async function executeBeastModeTask(input: BeastModeExecutionInput): Promise<BeastModeExecutionOutput> {
  const execution = await executeMarketingModelTask({
    tenantId: input.brief.tenantId,
    workspaceId: input.brief.workspaceId,
    hostAppId: input.brief.hostAppId,
    mode: input.mode,
    task: "platform_copywriting",
    brandKit: input.brief.brandSummary as Record<string, unknown>,
    campaignBrief: {
      campaignName: input.brief.campaignName,
      goal: input.brief.goal,
      audience: input.brief.audience,
      offer: input.brief.offer,
      primaryCta: input.brief.primaryCta,
    },
    platform: input.platform,
    language: input.language,
    contentType: input.contentType,
    audience: input.brief.audience,
    offer: input.brief.offer,
    constraints: [
      "Return concise high-conversion variant copy.",
      "No empty hook/body/cta.",
      "reviewStatus must be needs_review.",
    ],
    providerHealthRegistry: input.providerHealthRegistry,
  });

  return {
    generationMode: execution.generationMode,
    provider: execution.provider,
    model: execution.model,
    selectedProvider: execution.selectedProvider,
    selectedModel: execution.selectedModel,
    executedProvider: execution.executedProvider,
    executedModel: execution.executedModel,
    routeEnforced: execution.routeEnforced,
    routeMismatchReason: execution.routeMismatchReason,
    task: input.task,
    mode: input.mode,
    routeReason: execution.routeReason,
    fallbackReason: execution.fallbackReason,
    estimatedCostTier: execution.estimatedCostTier ?? "medium",
    generatedAt: execution.generatedAt,
    status: execution.status,
    parserWarnings: execution.parserWarnings,
    providerStatus: execution.providerStatus,
    copy: normalizeCopy(execution.output, input),
  };
}

export async function buildModelBackedVariantDraft(input: {
  brief: BeastModeBrief;
  platform: CampaignPlatform;
  contentType: BeastModeVariantContentType;
  language: BeastModeLanguage;
  variantIndex: number;
  providerHealthRegistry?: BeastModeProviderHealth[];
}): Promise<BeastModeVariantDraft & { executionMeta: BeastModeExecutionOutput }> {
  const exec = await executeBeastModeTask({
    task: "copywriting",
    mode: input.brief.mode,
    brief: input.brief,
    platform: input.platform,
    contentType: input.contentType,
    language: input.language,
    variantIndex: input.variantIndex,
    providerHealthRegistry: input.providerHealthRegistry,
  });

  const routeMeta = buildMarketingRouteMetadata({
    status: exec.status,
    generationMode: exec.generationMode,
    provider: exec.provider as any,
    model: exec.model,
    selectedProvider: exec.selectedProvider as any,
    selectedModel: exec.selectedModel,
    executedProvider: exec.executedProvider as any,
    executedModel: exec.executedModel,
    routeEnforced: exec.routeEnforced,
    routeMismatchReason: exec.routeMismatchReason,
    task: "platform_copywriting",
    mode: input.brief.mode,
    routeReason: exec.routeReason,
    estimatedCostTier: (exec.estimatedCostTier as "low" | "medium" | "high") ?? null,
    fallbackReason: exec.fallbackReason,
    generatedAt: exec.generatedAt,
    output: {},
    rawText: null,
    warnings: [],
    parserWarnings: exec.parserWarnings,
    providerStatus: exec.providerStatus,
    reviewStatus: "needs_review",
  });

  const draft: BeastModeVariantDraft = {
    platform: input.platform,
    contentType: input.contentType,
    language: input.language,
    angle: exec.copy.angle,
    hook: exec.copy.hook,
    body: exec.copy.body,
    cta: exec.copy.cta,
    hashtags: exec.copy.hashtags,
    visualPrompt: exec.copy.visualPrompt,
    studioPlan: null,
    metadata: {
      ...routeMeta,
      executionStatus: exec.status,
      reviewStatus: "needs_review",
      routing: {
        copywriting: {
          provider: exec.provider,
          model: exec.model,
          selectedProvider: exec.selectedProvider,
          selectedModel: exec.selectedModel,
          executedProvider: exec.executedProvider,
          executedModel: exec.executedModel,
          routeEnforced: exec.routeEnforced,
          routeMismatchReason: exec.routeMismatchReason,
          routeReason: exec.routeReason,
          providerStatus: exec.providerStatus,
          generationMode: exec.generationMode,
          fallbackReason: exec.fallbackReason,
        },
      },
    },
  };

  return { ...draft, executionMeta: exec };
}
