import { discoverProviderModels, type ProviderModelDescriptor } from "../../../_core/ai/modelRegistry";
import { getProviderHealth } from "../../../_core/ai/providers/providerRegistry";
import { getDiscoveredGenXModels } from "./genxModelCatalogSync";
import { getTaskMappedHuggingFaceModels } from "./huggingFaceModelRegistry";
import { createMarketingProviderHealthCheck } from "./providerHealthStore";
import { upsertMarketingProviderModel } from "./providerModelStore";
import { getConfiguredQwenModels } from "./qwenModelRegistry";
import type { MarketingCostTier, MarketingModelCategory, MarketingProviderModelRecord, MarketingQualityTier, MarketingTask, MarketingSetupStatus } from "./providerCapabilityTypes";

function deriveCategory(model: ProviderModelDescriptor): MarketingModelCategory {
  if (model.supportsAvatar || model.executableTasks.includes("avatar_video")) return "video";
  if (model.supportsVideo || model.executableTasks.includes("text_to_video") || model.executableTasks.includes("image_to_video")) return "video";
  if (model.supportsImage || model.executableTasks.includes("text_to_image") || model.executableTasks.includes("image_edit")) return "image";
  if (model.supportsVoice || model.executableTasks.includes("text_to_speech")) return "voice";
  if (model.supportsAudio || model.executableTasks.includes("speech_to_text")) return "audio";
  if (model.executableTasks.includes("image_captioning")) return "vision";
  if (model.executableTasks.includes("embeddings")) return "embedding";
  if (model.multimodal) return "multimodal";
  return "text";
}

function deriveCostTier(modelId: string, provider: string): MarketingCostTier {
  const lower = modelId.toLowerCase();
  if (provider === "huggingface") return "free";
  if (lower.includes("mini") || lower.includes("small") || lower.includes("flash")) return "budget";
  if (lower.includes("pro") || lower.includes("plus") || lower.includes("max")) return "premium";
  if (lower.includes("elite") || lower.includes("ultra")) return "elite";
  return provider === "qwen" ? "budget" : "standard";
}

function deriveQualityTier(modelId: string): MarketingQualityTier {
  const lower = modelId.toLowerCase();
  if (lower.includes("elite") || lower.includes("max") || lower.includes("ultra")) return "elite";
  if (lower.includes("pro") || lower.includes("plus")) return "premium";
  if (lower.includes("mini") || lower.includes("small") || lower.includes("flash")) return "basic";
  return "good";
}

function deriveSetupStatus(model: ProviderModelDescriptor): MarketingSetupStatus {
  if (!model.executableTasks.length) return "setup_needed";
  if (model.executionMode === "not_executable") return "provider_unavailable";
  return "ready";
}

function mapModelToMarketingRecord(model: ProviderModelDescriptor): MarketingProviderModelRecord {
  const category = deriveCategory(model);
  const outputModalities = [
    model.supportsVideo ? "video" : null,
    model.supportsImage ? "image" : null,
    model.supportsVoice ? "voice" : null,
    model.supportsAudio ? "audio" : null,
    category === "text" ? "text" : null,
  ].filter(Boolean) as string[];

  return {
    provider: model.provider,
    modelId: model.id,
    displayName: model.id,
    category,
    supportedTasks: model.executableTasks as MarketingTask[],
    inputModalities: model.multimodal ? ["text", "image", "audio"] : ["text"],
    outputModalities: outputModalities.length ? outputModalities : ["text"],
    maxContextTokens: null,
    maxDurationSeconds: category === "video" ? 120 : null,
    supportedAspectRatios: category === "video" || category === "image" ? ["1:1", "9:16", "16:9"] : [],
    supportedLanguages: ["en"],
    costTier: deriveCostTier(model.id, model.provider),
    pricing: null,
    qualityTier: deriveQualityTier(model.id),
    isAvailable: model.executableTasks.length > 0,
    setupStatus: deriveSetupStatus(model),
    source: model.source === "fallback" ? "fallback" : "synced",
    metadata: {
      endpointFamily: model.endpointFamily,
      executionMode: model.executionMode,
      routeReason: model.routeReason,
      unavailableReasonsByTask: model.unavailableReasonsByTask ?? {},
    },
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function syncMarketingProviderCapabilitiesForWorkspace(input: { tenantId: string; workspaceId: string; forceRefresh?: boolean }) {
  const snapshot = await discoverProviderModels(input.forceRefresh ?? true);

  const grouped = [
    ...getDiscoveredGenXModels(snapshot.providers.genx ?? []),
    ...getConfiguredQwenModels(snapshot.providers.qwen ?? []),
    ...getTaskMappedHuggingFaceModels(snapshot.providers.huggingface ?? []),
  ];

  const upserts = await Promise.all(grouped.map((model) => upsertMarketingProviderModel({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    model: mapModelToMarketingRecord(model),
  })));

  const health = await getProviderHealth();
  await Promise.all(health.map((item) => createMarketingProviderHealthCheck({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    provider: item.provider,
    modelId: item.model ?? null,
    status: item.liveReady ? "ok" : item.configured ? "degraded" : "setup_needed",
    latencyMs: item.lastLatencyMs ?? null,
    errorMessage: item.lastError ?? null,
  })));

  const providerCounts = Object.fromEntries((Object.entries(snapshot.providers) as Array<[string, ProviderModelDescriptor[]]>).map(([provider, models]) => [provider, models.length]));

  const categoryCounts = grouped.reduce<Record<string, number>>((acc, model) => {
    const category = deriveCategory(model);
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  const taskCounts = grouped.reduce<Record<string, number>>((acc, model) => {
    for (const task of model.executableTasks) {
      acc[task] = (acc[task] ?? 0) + 1;
    }
    return acc;
  }, {});

  return {
    discoveredAt: snapshot.discoveredAt,
    persistedModels: upserts.filter(Boolean).length,
    providerCounts,
    categoryCounts,
    taskCounts,
  };
}
