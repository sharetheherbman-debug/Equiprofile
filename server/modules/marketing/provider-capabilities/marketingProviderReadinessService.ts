import { listMarketingProviderHealthChecks } from "./providerHealthStore";
import { listMarketingProviderModels } from "./providerModelStore";

function summarizeCapability(models: Array<{ category: string; setupStatus: string; isAvailable: boolean }>, category: string) {
  const scoped = models.filter((model) => model.category === category || (category === "avatar" && model.category === "video"));
  if (!scoped.length) return "setup_needed";
  if (scoped.some((model) => model.isAvailable && model.setupStatus === "ready")) return "ready";
  return scoped.some((model) => model.setupStatus === "provider_unavailable") ? "provider_unavailable" : "setup_needed";
}

export async function getMarketingProviderReadinessSummary(input: { tenantId: string; workspaceId: string }) {
  const [models, healthChecks] = await Promise.all([
    listMarketingProviderModels(input),
    listMarketingProviderHealthChecks(input),
  ]);

  const latestHealthByProvider = new Map<string, (typeof healthChecks)[number]>();
  for (const row of healthChecks) {
    if (!latestHealthByProvider.has(row.provider)) latestHealthByProvider.set(row.provider, row);
  }

  const providers = ["genx", "qwen", "huggingface"].map((provider) => {
    const providerModels = models.filter((model) => model.provider === provider);
    const health = latestHealthByProvider.get(provider);
    return {
      provider,
      modelCount: providerModels.length,
      setupStatus: providerModels.some((model) => model.setupStatus === "ready") ? "ready" : "setup_needed",
      healthStatus: health?.status ?? "setup_needed",
      healthMessage: health?.errorMessage ?? null,
    };
  });

  return {
    providers,
    readinessByCapability: {
      avatar: summarizeCapability(models, "avatar"),
      voice: summarizeCapability(models, "voice"),
      music: summarizeCapability(models, "audio"),
      image: summarizeCapability(models, "image"),
      video: summarizeCapability(models, "video"),
      visualQa: summarizeCapability(models, "vision"),
    },
    totalModels: models.length,
  };
}
