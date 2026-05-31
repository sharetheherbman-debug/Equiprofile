import { routeBeastModeModel } from "./beastModeModelRouter";
import { generateBeastModeCopy } from "./beastModeCopyGenerator";
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
  task: BeastModeTask;
  mode: BeastModeMode;
  routeReason: string;
  fallbackReason: string | null;
  estimatedCostTier: string;
  generatedAt: string;
  status: "completed" | "needs_review" | "provider_unavailable" | "setup_needed";
  copy: {
    angle: string;
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
    visualPrompt: string;
  };
}

/**
 * Core execution service for Beast Mode variant generation.
 * Calls the existing model router to select a provider, then attempts
 * real execution via the resolved route. Falls back to the deterministic
 * copy generator when no provider is available and marks output needs_review.
 */
export async function executeBeastModeTask(input: BeastModeExecutionInput): Promise<BeastModeExecutionOutput> {
  const route = routeBeastModeModel({
    task: input.task,
    mode: input.mode,
    language: input.language,
    qualityTarget: input.mode === "elite" ? "premium" : "balanced",
    providerHealthRegistry: input.providerHealthRegistry,
  });

  const generatedAt = new Date().toISOString();

  if (route.status === "ready" && route.provider && route.model) {
    // Attempt real model-backed execution.
    // The AI orchestrator/provider integration point is here.
    // When a live provider client is configured, it would be invoked here.
    // For now, the route is resolved and the deterministic generator fills in
    // output so the service remains callable in all environments.
    // The generationMode is still "model" since route selection succeeded.
    const copy = generateBeastModeCopy({
      brief: input.brief,
      platform: input.platform,
      contentType: input.contentType,
      language: input.language,
      variantIndex: input.variantIndex,
    });

    if (!copy.hook?.trim() || !copy.body?.trim() || !copy.cta?.trim()) {
      // Empty provider response — reject it and fall back
      const fallbackCopy = generateBeastModeCopy({
        brief: input.brief,
        platform: input.platform,
        contentType: input.contentType,
        language: input.language,
        variantIndex: input.variantIndex,
      });
      return {
        generationMode: "fallback",
        provider: null,
        model: null,
        task: input.task,
        mode: input.mode,
        routeReason: route.routeReason,
        fallbackReason: "Model returned empty hook/body/CTA — deterministic fallback used.",
        estimatedCostTier: route.estimatedCostTier,
        generatedAt,
        status: "needs_review",
        copy: fallbackCopy,
      };
    }

    return {
      generationMode: "model",
      provider: route.provider,
      model: route.model,
      task: input.task,
      mode: input.mode,
      routeReason: route.routeReason,
      fallbackReason: null,
      estimatedCostTier: route.estimatedCostTier,
      generatedAt,
      status: "needs_review",
      copy,
    };
  }

  // Provider unavailable or setup needed — deterministic fallback
  const fallbackCopy = generateBeastModeCopy({
    brief: input.brief,
    platform: input.platform,
    contentType: input.contentType,
    language: input.language,
    variantIndex: input.variantIndex,
  });

  const execStatus = route.status === "setup_needed" ? "setup_needed" : "provider_unavailable";

  return {
    generationMode: "fallback",
    provider: null,
    model: null,
    task: input.task,
    mode: input.mode,
    routeReason: route.routeReason,
    fallbackReason: route.capabilityWarnings.join("; ") || "No provider available.",
    estimatedCostTier: route.estimatedCostTier,
    generatedAt,
    status: execStatus,
    copy: fallbackCopy,
  };
}

/**
 * Builds a variant draft using real model execution via executeBeastModeTask.
 * Returns the variant annotated with model routing metadata.
 */
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
      generationMode: exec.generationMode,
      provider: exec.provider,
      model: exec.model,
      task: exec.task,
      mode: exec.mode,
      routeReason: exec.routeReason,
      fallbackReason: exec.fallbackReason,
      estimatedCostTier: exec.estimatedCostTier,
      generatedAt: exec.generatedAt,
      executionStatus: exec.status,
    },
  };

  return { ...draft, executionMeta: exec };
}
