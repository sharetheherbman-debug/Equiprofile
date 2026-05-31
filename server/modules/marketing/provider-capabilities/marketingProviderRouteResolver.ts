import { evaluateBudgetPolicy } from "./marketingBudgetPolicy";
import { getMarketingTaskCapabilityEntry } from "./marketingTaskCapabilityMatrix";
import { listMarketingProviderModels } from "./providerModelStore";
import type { MarketingTask, WorkspaceBudgetPolicy } from "./providerCapabilityTypes";

export type MarketingRouteDecision = {
  status: "ready" | "setup_needed" | "provider_unavailable" | "budget_blocked";
  reason: string | null;
  selected: {
    provider: string;
    modelId: string;
    category: string;
    canonicalTask: string;
    routeType: "model" | "media_factory_assembled_video";
  } | null;
  candidates: Array<{ provider: string; modelId: string; category: string; costTier: string; setupStatus: string }>;
};

export async function resolveMarketingProviderRoute(input: {
  tenantId: string;
  workspaceId: string;
  task: MarketingTask;
  policy: WorkspaceBudgetPolicy;
  provider?: string;
  modelId?: string;
}) : Promise<MarketingRouteDecision> {
  const taskConfig = getMarketingTaskCapabilityEntry(input.task);
  if (input.task === "scene_planning") {
    return {
      status: "ready",
      reason: "Long-form video is routed to Media Factory assembled_video only.",
      selected: {
        provider: "media_factory",
        modelId: "assembled_video",
        category: "video",
        canonicalTask: taskConfig.canonicalTask,
        routeType: "media_factory_assembled_video",
      },
      candidates: [],
    };
  }

  const models = await listMarketingProviderModels({ tenantId: input.tenantId, workspaceId: input.workspaceId });
  const preference = input.policy.mode === "elite" ? taskConfig.elitePreference : taskConfig.standardPreference;
  const allowedProviders = input.policy.mode === "standard" && !input.policy.allowGenXFallbackInStandard
    ? preference.filter((provider) => provider !== "genx")
    : preference;
  const providerPriority = new Map(allowedProviders.map((provider, index) => [provider, index]));

  const scoped = models
    .filter((model) => model.supportedTasks.includes(input.task))
    .filter((model) => model.setupStatus === "ready")
    .filter((model) => !input.provider || model.provider === input.provider)
    .filter((model) => !input.modelId || model.modelId.toLowerCase() === input.modelId.toLowerCase())
    .sort((a, b) => (providerPriority.get(a.provider) ?? Number.MAX_SAFE_INTEGER) - (providerPriority.get(b.provider) ?? Number.MAX_SAFE_INTEGER));

  if (!scoped.length) {
    return {
      status: "setup_needed",
      reason: "No ready provider model found for the requested marketing task.",
      selected: null,
      candidates: models
        .filter((model) => model.supportedTasks.includes(input.task))
        .map((model) => ({ provider: model.provider, modelId: model.modelId, category: model.category, costTier: model.costTier, setupStatus: model.setupStatus })),
    };
  }

  const chosen = scoped[0];
  const budget = evaluateBudgetPolicy({ policy: input.policy, costTier: chosen.costTier, task: input.task, provider: chosen.provider });
  if (!budget.allowed) {
    return {
      status: "budget_blocked",
      reason: budget.reason,
      selected: null,
      candidates: scoped.map((model) => ({ provider: model.provider, modelId: model.modelId, category: model.category, costTier: model.costTier, setupStatus: model.setupStatus })),
    };
  }

  return {
    status: "ready",
    reason: null,
    selected: {
      provider: chosen.provider,
      modelId: chosen.modelId,
      category: chosen.category,
      canonicalTask: taskConfig.canonicalTask,
      routeType: "model",
    },
    candidates: scoped.map((model) => ({ provider: model.provider, modelId: model.modelId, category: model.category, costTier: model.costTier, setupStatus: model.setupStatus })),
  };
}
