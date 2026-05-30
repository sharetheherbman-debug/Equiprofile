import { resolveBeastModeCostTier } from "./beastModeCostPolicy";
import type { BeastModeModelRoute, BeastModeMode, BeastModeProvider, BeastModeProviderHealth, BeastModeTask } from "./beastModeTypes";

const DEFAULT_HEALTH: BeastModeProviderHealth[] = [
  { provider: "qwen", available: true, configured: true },
  { provider: "huggingface", available: true, configured: true },
  { provider: "genx", available: true, configured: true },
];

function healthFor(provider: BeastModeProvider, registry: BeastModeProviderHealth[]) {
  return registry.find((item) => item.provider === provider) ?? { provider, available: false, configured: false };
}

function providerReady(provider: BeastModeProvider, registry: BeastModeProviderHealth[]) {
  const item = healthFor(provider, registry);
  return item.available && item.configured;
}

function preferredProviders(task: BeastModeTask, mode: BeastModeMode): BeastModeProvider[] {
  if (mode === "elite") {
    if (["strategy", "scriptwriting", "scene_planning", "prompt_direction", "copywriting"].includes(task)) {
      return ["genx", "huggingface", "qwen"];
    }
    return ["genx", "qwen", "huggingface"];
  }
  if (["copywriting", "hook_generation", "translation", "captioning", "qa_summary"].includes(task)) {
    return ["qwen", "huggingface", "genx"];
  }
  return ["huggingface", "qwen", "genx"];
}

function modelFor(provider: BeastModeProvider, task: BeastModeTask, mode: BeastModeMode) {
  if (provider === "genx") return mode === "elite" ? "genx-premium-strategy" : "genx-balanced";
  if (provider === "huggingface") return task === "translation" ? "hf-nllb-localizer" : "hf-qwen-instruct";
  return task === "translation" ? "qwen-translate" : "qwen-plus-marketing";
}

export function routeBeastModeModel(input: {
  task: BeastModeTask;
  mode: BeastModeMode;
  language?: string;
  qualityTarget?: "balanced" | "premium";
  maxCostTier?: "low" | "medium" | "high";
  providerHealthRegistry?: BeastModeProviderHealth[];
}): BeastModeModelRoute {
  const registry = input.providerHealthRegistry?.length ? input.providerHealthRegistry : DEFAULT_HEALTH;
  const preferred = preferredProviders(input.task, input.mode);
  const estimatedCostTier = resolveBeastModeCostTier(input);
  const warnings: string[] = [];
  const primary = preferred.find((provider) => providerReady(provider, registry)) ?? null;
  const fallbacks = preferred.filter((provider) => provider !== primary && providerReady(provider, registry));

  if (primary) {
    return {
      status: "ready",
      provider: primary,
      model: modelFor(primary, input.task, input.mode),
      routeReason:
        input.mode === "standard"
          ? `${primary} selected for cost-aware ${input.task} generation.`
          : `${primary} selected for premium ${input.task} quality.`,
      fallbackProviders: fallbacks,
      estimatedCostTier,
      capabilityWarnings: warnings,
    };
  }

  const configuredButDown = preferred.find((provider) => healthFor(provider, registry).configured);
  if (configuredButDown) {
    warnings.push("Preferred providers are currently unavailable.");
    return {
      status: "provider_unavailable",
      provider: null,
      model: null,
      routeReason: `No healthy provider available for ${input.task}.`,
      fallbackProviders: [],
      estimatedCostTier,
      capabilityWarnings: warnings,
    };
  }

  warnings.push("Provider setup is required before Beast Mode can generate this task.");
  return {
    status: "setup_needed",
    provider: null,
    model: null,
    routeReason: `No configured provider available for ${input.task}.`,
    fallbackProviders: [],
    estimatedCostTier,
    capabilityWarnings: warnings,
  };
}
