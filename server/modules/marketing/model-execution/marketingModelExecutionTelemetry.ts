import type { MarketingExecutionGenerationMode, MarketingExecutionMode, MarketingModelExecutionOutput, MarketingRoutingSummary } from "./marketingModelExecutionTypes";

export function buildMarketingRouteMetadata(result: MarketingModelExecutionOutput) {
  return {
    generationMode: result.generationMode,
    provider: result.provider,
    model: result.model,
    selectedProvider: result.selectedProvider,
    selectedModel: result.selectedModel,
    executedProvider: result.executedProvider,
    executedModel: result.executedModel,
    routeEnforced: result.routeEnforced,
    routeMismatchReason: result.routeMismatchReason,
    task: result.task,
    mode: result.mode,
    routeReason: result.routeReason,
    fallbackReason: result.fallbackReason,
    estimatedCostTier: result.estimatedCostTier,
    generatedAt: result.generatedAt,
    parserWarnings: result.parserWarnings,
    providerStatus: result.providerStatus,
    reviewStatus: "needs_review" as const,
  };
}

export function summarizeMarketingRouting(input: {
  entries: Array<{
    provider: string | null;
    selectedProvider?: string | null;
    executedProvider?: string | null;
    generationMode: MarketingExecutionGenerationMode;
    status: MarketingModelExecutionOutput["status"];
    mode: MarketingExecutionMode;
    routeEnforced?: boolean;
    routeMismatchReason?: string | null;
  }>;
}): MarketingRoutingSummary {
  const countsByProvider: Record<string, number> = {};
  const countsBySelectedProvider: Record<string, number> = {};
  const countsByExecutedProvider: Record<string, number> = {};
  const countsByGenerationMode: Record<MarketingExecutionGenerationMode, number> = { model: 0, fallback: 0 };
  const modeSummary: Record<MarketingExecutionMode, number> = { standard: 0, elite: 0 };
  let enforcedCount = 0;
  let fallbackCount = 0;
  let mismatchCount = 0;
  let providerUnavailableCount = 0;
  let modelExecutionCount = 0;
  let failedOrSetupNeededCount = 0;

  for (const entry of input.entries) {
    const providerKey = entry.provider ?? "none";
    countsByProvider[providerKey] = (countsByProvider[providerKey] ?? 0) + 1;
    const selectedProviderKey = entry.selectedProvider ?? "none";
    countsBySelectedProvider[selectedProviderKey] = (countsBySelectedProvider[selectedProviderKey] ?? 0) + 1;
    const executedProviderKey = entry.executedProvider ?? "none";
    countsByExecutedProvider[executedProviderKey] = (countsByExecutedProvider[executedProviderKey] ?? 0) + 1;
    countsByGenerationMode[entry.generationMode] += 1;
    modeSummary[entry.mode] += 1;
    if (entry.generationMode === "model") modelExecutionCount += 1;
    if (entry.routeEnforced === true) enforcedCount += 1;
    if (entry.generationMode === "fallback") fallbackCount += 1;
    const mismatchDetected = entry.routeEnforced === false || Boolean(entry.routeMismatchReason);
    if (mismatchDetected) mismatchCount += 1;
    if (entry.status === "provider_unavailable") providerUnavailableCount += 1;
    if (entry.status === "failed" || entry.status === "setup_needed" || entry.status === "provider_unavailable") {
      failedOrSetupNeededCount += 1;
    }
  }

  return {
    countsByProvider,
    countsBySelectedProvider,
    countsByExecutedProvider,
    countsByGenerationMode,
    enforcedCount,
    fallbackCount,
    mismatchCount,
    providerUnavailableCount,
    modelExecutionCount,
    failedOrSetupNeededCount,
    modeSummary,
  };
}
