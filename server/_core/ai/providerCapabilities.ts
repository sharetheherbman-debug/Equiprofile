import type { AIProviderName, AITask } from "./types";
import {
  type CapabilityCategory,
  type ProviderModelDescriptor,
  discoverProviderModels,
} from "./providerModelDiscovery";

export type ProviderCapabilityProfile = {
  provider: AIProviderName;
  fallbackPriority: number;
  capabilities: Record<CapabilityCategory, number>;
  modelCount: number;
  multimodalModelCount: number;
  models: ProviderModelDescriptor[];
};

export type ProviderSelectionDecision = {
  task: AITask;
  category: CapabilityCategory;
  primaryProvider: AIProviderName;
  primaryModel: string | null;
  fallbackProviders: AIProviderName[];
};

const ALL_PROVIDERS: AIProviderName[] = ["genx", "huggingface", "qwen"];

const FALLBACK_PRIORITY: Record<AIProviderName, number> = {
  genx: 100,
  huggingface: 85,
  qwen: 75,
};

const BASE_CAPABILITY_WEIGHTS: Record<AIProviderName, Partial<Record<CapabilityCategory, number>>> = {
  genx: {
    strategy: 0.94,
    reasoning: 0.95,
    copywriting: 0.94,
    storyboard_generation: 0.83,
    campaign_generation: 0.93,
    email_generation: 0.92,
    social_generation: 0.91,
    scheduling: 0.85,
    compliance_review: 0.84,
    learning: 0.8,
    analytics: 0.82,
  },
  huggingface: {
    image_generation: 0.94,
    image_editing: 0.9,
    text_to_video: 0.88,
    avatar_video: 0.84,
    text_to_speech: 0.84,
    speech_to_text: 0.88,
    image_captioning: 0.87,
    embeddings: 0.9,
    compliance_review: 0.8,
    analytics: 0.79,
  },
  qwen: {
    strategy: 0.86,
    reasoning: 0.88,
    copywriting: 0.89,
    campaign_generation: 0.82,
    email_generation: 0.82,
    social_generation: 0.82,
    learning: 0.77,
    analytics: 0.75,
  },
};

const TASK_TO_CAPABILITY: Record<AITask, CapabilityCategory> = {
  chat: "reasoning",
  copywriting: "copywriting",
  text_to_image: "image_generation",
  image_edit: "image_editing",
  image_to_video: "text_to_video",
  text_to_video: "text_to_video",
  avatar_video: "avatar_video",
  speech_to_text: "speech_to_text",
  text_to_speech: "text_to_speech",
  image_captioning: "image_captioning",
  classification: "analytics",
  moderation: "compliance_review",
  embeddings: "embeddings",
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

const CAPABILITY_LIST: CapabilityCategory[] = [
  "strategy",
  "reasoning",
  "copywriting",
  "image_generation",
  "image_editing",
  "text_to_video",
  "avatar_video",
  "text_to_speech",
  "speech_to_text",
  "image_captioning",
  "storyboard_generation",
  "campaign_generation",
  "email_generation",
  "social_generation",
  "scheduling",
  "compliance_review",
  "embeddings",
  "learning",
  "analytics",
];

function boostForModels(provider: AIProviderName, category: CapabilityCategory, models: ProviderModelDescriptor[]) {
  const supporting = models.filter((model) => model.categories.includes(category));
  if (!supporting.length) return 0;

  const best = supporting
    .map((model) => model.suitabilityScore + (model.multimodal ? 0.04 : 0))
    .sort((a, b) => b - a)[0] ?? 0;

  const depthBoost = Math.min(0.08, supporting.length * 0.01);
  const providerBonus = provider === "genx" && ["strategy", "reasoning", "copywriting"].includes(category) ? 0.03 : 0;
  return best * 0.12 + depthBoost + providerBonus;
}

export async function getProviderCapabilityRegistry(): Promise<Record<AIProviderName, ProviderCapabilityProfile>> {
  const discovery = await discoverProviderModels();

  const profiles = ALL_PROVIDERS.map((provider) => {
    const models = discovery.providers[provider] ?? [];
    const capabilities = Object.fromEntries(
      CAPABILITY_LIST.map((category) => {
        const base = BASE_CAPABILITY_WEIGHTS[provider][category] ?? 0.35;
        const boosted = clamp(base + boostForModels(provider, category, models));
        return [category, boosted];
      }),
    ) as Record<CapabilityCategory, number>;

    return {
      provider,
      fallbackPriority: FALLBACK_PRIORITY[provider],
      capabilities,
      modelCount: models.length,
      multimodalModelCount: models.filter((model) => model.multimodal).length,
      models,
    } satisfies ProviderCapabilityProfile;
  });

  return {
    genx: profiles.find((profile) => profile.provider === "genx")!,
    huggingface: profiles.find((profile) => profile.provider === "huggingface")!,
    qwen: profiles.find((profile) => profile.provider === "qwen")!,
  };
}

export async function rankProvidersForCapability(category: CapabilityCategory): Promise<AIProviderName[]> {
  const registry = await getProviderCapabilityRegistry();

  return [...ALL_PROVIDERS]
    .sort((a, b) => {
      const scoreA = registry[a].capabilities[category] + registry[a].fallbackPriority / 1_000;
      const scoreB = registry[b].capabilities[category] + registry[b].fallbackPriority / 1_000;
      return scoreB - scoreA;
    });
}

export async function getBestModelForCapability(provider: AIProviderName, category: CapabilityCategory): Promise<string | null> {
  const registry = await getProviderCapabilityRegistry();
  const candidates = registry[provider].models
    .filter((model) => model.categories.includes(category))
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return candidates[0]?.id ?? null;
}

export function categoryForTask(task: AITask): CapabilityCategory {
  return TASK_TO_CAPABILITY[task];
}

export async function selectProviderOrderForTask(task: AITask): Promise<AIProviderName[]> {
  const category = categoryForTask(task);
  return rankProvidersForCapability(category);
}

export async function resolveProviderSelectionForTask(task: AITask): Promise<ProviderSelectionDecision> {
  const category = categoryForTask(task);
  const providers = await rankProvidersForCapability(category);
  const primaryProvider = providers[0] ?? "genx";
  const primaryModel = await getBestModelForCapability(primaryProvider, category);

  return {
    task,
    category,
    primaryProvider,
    primaryModel,
    fallbackProviders: providers.slice(1),
  };
}
