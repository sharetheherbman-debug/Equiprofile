import { getRuntimeConfig } from "../../dynamicConfig";
import { abortableFetch, buildEndpoint } from "./providers/httpUtils";
import { resolveGenXConfig } from "./providers/genxProvider";
import { resolveHuggingFaceTaskModel } from "./providers/huggingFaceProvider";
import type { AIProviderName, AITask } from "./types";

export const CAPABILITY_CATEGORIES = [
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
] as const;

export type CapabilityCategory = (typeof CAPABILITY_CATEGORIES)[number];

export type ProviderModelDescriptor = {
  id: string;
  provider: AIProviderName;
  source: "live_discovery" | "task_config" | "fallback";
  categories: CapabilityCategory[];
  suitabilityScore: number;
  multimodal: boolean;
};

export type ProviderModelDiscoverySnapshot = {
  discoveredAt: string;
  providers: Record<AIProviderName, ProviderModelDescriptor[]>;
};

const MODEL_DISCOVERY_CACHE_TTL_MS = 10 * 60 * 1000;
let cachedDiscovery: { expiresAt: number; value: ProviderModelDiscoverySnapshot } | null = null;

const CATEGORY_KEYWORDS: Array<{ category: CapabilityCategory; keywords: string[] }> = [
  { category: "strategy", keywords: ["reason", "planner", "strategy", "think"] },
  { category: "reasoning", keywords: ["reason", "r1", "think", "chain"] },
  { category: "copywriting", keywords: ["chat", "instruct", "text", "copy"] },
  { category: "image_generation", keywords: ["image", "flux", "sdxl", "diffusion"] },
  { category: "image_editing", keywords: ["edit", "inpaint", "refiner"] },
  { category: "text_to_video", keywords: ["video", "mochi", "wan", "i2v", "t2v"] },
  { category: "avatar_video", keywords: ["avatar", "talking", "presenter"] },
  { category: "text_to_speech", keywords: ["tts", "bark", "speech", "voice"] },
  { category: "speech_to_text", keywords: ["stt", "whisper", "transcribe"] },
  { category: "image_captioning", keywords: ["caption", "blip", "vision"] },
  { category: "storyboard_generation", keywords: ["story", "visual", "director"] },
  { category: "campaign_generation", keywords: ["campaign", "marketing", "growth"] },
  { category: "email_generation", keywords: ["email", "newsletter"] },
  { category: "social_generation", keywords: ["social", "reel", "short", "post"] },
  { category: "scheduling", keywords: ["schedule", "calendar"] },
  { category: "compliance_review", keywords: ["moderation", "compliance", "safety"] },
  { category: "embeddings", keywords: ["embedding", "vector", "sentence"] },
  { category: "learning", keywords: ["learn", "feedback", "adapt"] },
  { category: "analytics", keywords: ["analytics", "insight", "score"] },
];

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function inferCategories(modelIdRaw: string): CapabilityCategory[] {
  const modelId = modelIdRaw.toLowerCase();
  const categories = CATEGORY_KEYWORDS
    .filter((entry) => entry.keywords.some((keyword) => modelId.includes(keyword)))
    .map((entry) => entry.category);

  if (!categories.length) {
    if (modelId.includes("gpt") || modelId.includes("qwen")) {
      return ["reasoning", "copywriting", "strategy", "campaign_generation", "social_generation", "email_generation"];
    }
    return ["copywriting"];
  }

  if (categories.includes("copywriting") || categories.includes("reasoning")) {
    categories.push("campaign_generation", "social_generation", "email_generation");
  }

  return Array.from(new Set(categories));
}

function scoreModelSuitability(modelIdRaw: string, categories: CapabilityCategory[]): number {
  const modelId = modelIdRaw.toLowerCase();
  let score = 0.45;

  if (modelId.includes("gpt-5") || modelId.includes("reasoner") || modelId.includes("qwen-plus")) score += 0.3;
  if (modelId.includes("turbo") || modelId.includes("pro")) score += 0.15;
  if (categories.includes("text_to_video") || categories.includes("avatar_video")) score += 0.1;
  if (modelId.includes("schnell") || modelId.includes("mini")) score -= 0.05;

  return clampScore(score);
}

function isMultimodal(modelIdRaw: string, categories: CapabilityCategory[]) {
  const lower = modelIdRaw.toLowerCase();
  return categories.some((category) =>
    ["image_generation", "image_editing", "text_to_video", "avatar_video", "speech_to_text", "text_to_speech", "image_captioning"].includes(category),
  ) || lower.includes("vision") || lower.includes("omni") || lower.includes("audio");
}

async function discoverGenXModels(timeoutMs = 12_000): Promise<ProviderModelDescriptor[]> {
  const { key, base } = await resolveGenXConfig();
  if (!key || !base) return [];

  const endpoint = buildEndpoint(base, "/models");
  if (!endpoint) return [];

  try {
    const response = await abortableFetch(
      endpoint,
      {
        method: "GET",
        headers: { authorization: `Bearer ${key}` },
      },
      timeoutMs,
    );

    if (!response.ok) return [];
    const payload = await response.json() as { data?: Array<{ id?: string }> };
    const models = payload?.data ?? [];

    return models
      .map((entry) => String(entry?.id ?? "").trim())
      .filter(Boolean)
      .map((id) => {
        const categories = inferCategories(id);
        return {
          id,
          provider: "genx" as const,
          source: "live_discovery" as const,
          categories,
          suitabilityScore: scoreModelSuitability(id, categories),
          multimodal: isMultimodal(id, categories),
        };
      });
  } catch {
    return [];
  }
}

const HF_TASK_TO_CATEGORY: Partial<Record<AITask, CapabilityCategory>> = {
  copywriting: "copywriting",
  chat: "reasoning",
  text_to_image: "image_generation",
  image_edit: "image_editing",
  image_to_video: "text_to_video",
  text_to_video: "text_to_video",
  avatar_video: "avatar_video",
  text_to_speech: "text_to_speech",
  speech_to_text: "speech_to_text",
  image_captioning: "image_captioning",
  embeddings: "embeddings",
  moderation: "compliance_review",
  classification: "analytics",
};

async function discoverHuggingFaceTaskModels(): Promise<ProviderModelDescriptor[]> {
  const taskModels = await Promise.all(
    Object.entries(HF_TASK_TO_CATEGORY).map(async ([task, category]) => {
      if (!category) return null;
      const model = await resolveHuggingFaceTaskModel(task as AITask);
      if (!model) return null;
      const categories = inferCategories(model);
      categories.push(category);
      return {
        id: model,
        provider: "huggingface" as const,
        source: "task_config" as const,
        categories: Array.from(new Set(categories)),
        suitabilityScore: scoreModelSuitability(model, categories),
        multimodal: isMultimodal(model, categories),
      };
    }),
  );

  const deduped = new Map<string, ProviderModelDescriptor>();
  for (const item of taskModels) {
    if (!item) continue;
    const existing = deduped.get(item.id);
    if (!existing) {
      deduped.set(item.id, item);
      continue;
    }
    deduped.set(item.id, {
      ...existing,
      categories: Array.from(new Set([...existing.categories, ...item.categories])),
      suitabilityScore: Math.max(existing.suitabilityScore, item.suitabilityScore),
      multimodal: existing.multimodal || item.multimodal,
    });
  }

  return Array.from(deduped.values());
}

async function discoverQwenModels(): Promise<ProviderModelDescriptor[]> {
  const configuredModel =
    (await getRuntimeConfig("qwen_model", "QWEN_MODEL")) ||
    "qwen-plus";

  const categories = [
    "reasoning",
    "copywriting",
    "strategy",
    "campaign_generation",
    "social_generation",
    "email_generation",
  ] as CapabilityCategory[];

  return [
    {
      id: configuredModel,
      provider: "qwen",
      source: "fallback",
      categories,
      suitabilityScore: scoreModelSuitability(configuredModel, categories),
      multimodal: false,
    },
  ];
}

export function resetProviderModelDiscoveryCacheForTests() {
  cachedDiscovery = null;
}

export async function discoverProviderModels(forceRefresh = false): Promise<ProviderModelDiscoverySnapshot> {
  const now = Date.now();
  if (!forceRefresh && cachedDiscovery && cachedDiscovery.expiresAt > now) {
    return cachedDiscovery.value;
  }

  const [genx, huggingface, qwen] = await Promise.all([
    discoverGenXModels(),
    discoverHuggingFaceTaskModels(),
    discoverQwenModels(),
  ]);

  const snapshot: ProviderModelDiscoverySnapshot = {
    discoveredAt: new Date().toISOString(),
    providers: {
      genx,
      huggingface,
      qwen,
    },
  };

  cachedDiscovery = {
    expiresAt: now + MODEL_DISCOVERY_CACHE_TTL_MS,
    value: snapshot,
  };

  return snapshot;
}
