import type { MarketingExecutionGenerationMode, MarketingExecutionMode, MarketingModelExecutionOutput, MarketingRoutingSummary } from "./marketingModelExecutionTypes";

export function buildMarketingRouteMetadata(result: MarketingModelExecutionOutput) {
  return {
    generationMode: result.generationMode,
    provider: result.provider,
    model: result.model,
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
    generationMode: MarketingExecutionGenerationMode;
    status: MarketingModelExecutionOutput["status"];
    mode: MarketingExecutionMode;
  }>;
}): MarketingRoutingSummary {
  const countsByProvider: Record<string, number> = {};
  const countsByGenerationMode: Record<MarketingExecutionGenerationMode, number> = { model: 0, fallback: 0 };
  const modeSummary: Record<MarketingExecutionMode, number> = { standard: 0, elite: 0 };
  let fallbackCount = 0;
  let failedOrSetupNeededCount = 0;

  for (const entry of input.entries) {
    const providerKey = entry.provider ?? "none";
    countsByProvider[providerKey] = (countsByProvider[providerKey] ?? 0) + 1;
    countsByGenerationMode[entry.generationMode] += 1;
    modeSummary[entry.mode] += 1;
    if (entry.generationMode === "fallback") fallbackCount += 1;
    if (entry.status === "failed" || entry.status === "setup_needed" || entry.status === "provider_unavailable") {
      failedOrSetupNeededCount += 1;
    }
  }

  return {
    countsByProvider,
    countsByGenerationMode,
    fallbackCount,
    failedOrSetupNeededCount,
    modeSummary,
  };
}
