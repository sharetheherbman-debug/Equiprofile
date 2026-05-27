import { getRuntimeConfig } from "../../dynamicConfig";
import { discoverGenXModelIds } from "./providers/genxProvider";
import { resolveHuggingFaceTaskModels } from "./providers/huggingFaceProvider";
import { isQwenTaskExecutableViaCurrentRuntime, qwenUnsupportedTaskReason } from "./providers/qwenProvider";
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
  source: "live_discovery" | "task_config" | "fallback" | "default";
  categories: CapabilityCategory[];
  executableTasks: AITask[];
  suitabilityScore: number;
  multimodal: boolean;
  qualityTiers: Array<"fast" | "standard" | "elite" | "cinematic" | "avatar">;
  endpointFamily: "openai_chat" | "genx_async_job" | "hf_inference" | "dashscope_openai_chat" | "dashscope_openai_embeddings" | "dashscope_native_media" | "unknown";
  executionMode: "sync" | "async" | "not_executable";
  routeReason: string;
  lastTestedTimestamp?: string;
  lastSuccessByTask?: Partial<Record<AITask, string>>;
  lastFailureByTask?: Partial<Record<AITask, string>>;
  lastErrorReason?: string;
  unavailableReasonsByTask?: Partial<Record<AITask, string>>;
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
  { category: "image_generation", keywords: ["image", "img", "flux", "sdxl", "diffusion", "dall", "imagen", "stable"] },
  { category: "image_editing", keywords: ["edit", "inpaint", "refiner", "fill", "controlnet"] },
  { category: "text_to_video", keywords: ["video", "mochi", "wan", "i2v", "t2v", "veo", "kling", "runway", "sora", "hunyuan", "ltx", "minimax", "seedance", "pika", "hailuo"] },
  { category: "avatar_video", keywords: ["avatar", "talking", "presenter", "heygen", "hedra"] },
  { category: "text_to_speech", keywords: ["tts", "bark", "speech", "voice", "audio"] },
  { category: "speech_to_text", keywords: ["stt", "whisper", "transcribe", "audio"] },
  { category: "image_captioning", keywords: ["caption", "blip", "vision", "vl", "visual"] },
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

const TASK_TO_CATEGORY: Record<AITask, CapabilityCategory> = {
  chat: "reasoning",
  copywriting: "copywriting",
  strategy: "strategy",
  campaign_generation: "campaign_generation",
  social_generation: "social_generation",
  email_generation: "email_generation",
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
  analytics: "analytics",
};

const TEXT_TASKS = new Set<AITask>([
  "chat",
  "copywriting",
  "strategy",
  "campaign_generation",
  "social_generation",
  "email_generation",
  "classification",
  "moderation",
  "analytics",
]);
const MEDIA_TASKS = new Set<AITask>([
  "text_to_image",
  "image_edit",
  "image_to_video",
  "text_to_video",
  "avatar_video",
  "speech_to_text",
  "text_to_speech",
  "image_captioning",
]);

export type ProviderModelCandidate = ProviderModelDescriptor & {
  task: AITask;
  category: CapabilityCategory;
};

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

function tasksForCategories(provider: AIProviderName, modelId: string, categories: CapabilityCategory[]): AITask[] {
  const tasks = Object.entries(TASK_TO_CATEGORY)
    .filter(([, category]) => categories.includes(category))
    .map(([task]) => task as AITask);

  if (provider === "genx") {
    const lower = modelId.toLowerCase();
    const chatCapable = lower.includes("gpt") || lower.includes("claude") || lower.includes("llama") || lower.includes("mistral") || lower.includes("qwen") || lower.includes("chat") || lower.includes("sonnet");
    if (chatCapable) {
      return Array.from(new Set([...tasks.filter((task) => !MEDIA_TASKS.has(task) && task !== "embeddings"), "chat", "copywriting", "strategy", "campaign_generation", "social_generation", "email_generation", "classification", "moderation", "analytics"]));
    }
    return Array.from(new Set(tasks));
  }

  if (provider === "qwen") {
    return tasks.filter((task) => isQwenTaskExecutableViaCurrentRuntime(task));
  }

  return Array.from(new Set(tasks));
}

function qualityTiersForModel(modelIdRaw: string, categories: CapabilityCategory[]): ProviderModelDescriptor["qualityTiers"] {
  const lower = modelIdRaw.toLowerCase();
  const tiers: ProviderModelDescriptor["qualityTiers"] = ["standard"];
  if (lower.includes("fast") || lower.includes("schnell") || lower.includes("turbo") || lower.includes("flash")) tiers.push("fast");
  if (lower.includes("gpt-5") || lower.includes("max") || lower.includes("plus") || lower.includes("pro") || lower.includes("sonnet")) tiers.push("elite");
  if (categories.includes("text_to_video") || categories.includes("image_generation")) tiers.push("cinematic");
  if (categories.includes("avatar_video")) tiers.push("avatar");
  return Array.from(new Set(tiers));
}

function endpointForModel(provider: AIProviderName, task: AITask | null): ProviderModelDescriptor["endpointFamily"] {
  if (provider === "huggingface") return "hf_inference";
  if (provider === "genx") return task && TEXT_TASKS.has(task) ? "openai_chat" : "genx_async_job";
  if (provider === "qwen") {
    if (task === "embeddings") return "dashscope_openai_embeddings";
    if (task && isQwenTaskExecutableViaCurrentRuntime(task)) return "dashscope_openai_chat";
    return "dashscope_native_media";
  }
  return "unknown";
}

function buildDescriptor(opts: {
  id: string;
  provider: AIProviderName;
  source: ProviderModelDescriptor["source"];
  explicitTasks?: AITask[];
  routeReason: string;
}): ProviderModelDescriptor {
  const categories = inferCategories(opts.id);
  const executableTasks = opts.explicitTasks ?? tasksForCategories(opts.provider, opts.id, categories);
  const endpointFamily = endpointForModel(opts.provider, executableTasks[0] ?? null);
  const unavailableReasonsByTask: Partial<Record<AITask, string>> = {};

  if (opts.provider === "genx") {
    for (const task of MEDIA_TASKS) {
      if (!executableTasks.includes(task)) {
        unavailableReasonsByTask[task] = "GenX model was discovered, but no verified GenX media execution endpoint is configured in this runtime.";
      }
    }
  }
  if (opts.provider === "qwen") {
    for (const task of MEDIA_TASKS) {
      if (!isQwenTaskExecutableViaCurrentRuntime(task)) {
        unavailableReasonsByTask[task] = qwenUnsupportedTaskReason(task);
      }
    }
  }

  return {
    id: opts.id,
    provider: opts.provider,
    source: opts.source,
    categories,
    executableTasks,
    suitabilityScore: scoreModelSuitability(opts.id, categories),
    multimodal: isMultimodal(opts.id, categories),
    qualityTiers: qualityTiersForModel(opts.id, categories),
    endpointFamily,
    executionMode: executableTasks.length > 0
      ? opts.provider === "genx" && executableTasks.some((task) => MEDIA_TASKS.has(task)) ? "async" : "sync"
      : "not_executable",
    routeReason: opts.routeReason,
    unavailableReasonsByTask,
  };
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
  const result = await discoverGenXModelIds(timeoutMs);
  const configuredEntries = [
    { id: await getRuntimeConfig("genx_model", "GENX_MODEL"), tasks: ["chat", "copywriting", "strategy", "campaign_generation", "social_generation", "email_generation"] as AITask[] },
    { id: await getRuntimeConfig("genx_text_model", "GENX_TEXT_MODEL"), tasks: ["chat", "copywriting", "campaign_generation", "social_generation", "email_generation"] as AITask[] },
    { id: await getRuntimeConfig("genx_strategy_model", "GENX_STRATEGY_MODEL"), tasks: ["strategy", "campaign_generation", "classification", "moderation", "analytics"] as AITask[] },
    { id: await getRuntimeConfig("genx_image_model", "GENX_IMAGE_MODEL"), tasks: ["text_to_image", "image_edit"] as AITask[] },
    { id: await getRuntimeConfig("genx_video_model", "GENX_VIDEO_MODEL"), tasks: ["text_to_video", "image_to_video"] as AITask[] },
    { id: await getRuntimeConfig("genx_avatar_model", "GENX_AVATAR_MODEL"), tasks: ["avatar_video"] as AITask[] },
    { id: await getRuntimeConfig("genx_tts_model", "GENX_TTS_MODEL"), tasks: ["text_to_speech"] as AITask[] },
    { id: await getRuntimeConfig("genx_vision_model", "GENX_VISION_MODEL"), tasks: ["image_captioning", "speech_to_text"] as AITask[] },
  ].filter((entry): entry is { id: string; tasks: AITask[] } => !!entry.id);

  const descriptors = new Map<string, ProviderModelDescriptor>();
  for (const id of result.models) {
    descriptors.set(id, buildDescriptor({
      id,
      provider: "genx",
      source: "live_discovery",
      routeReason: `GenX /models discovery via ${result.endpoint ?? "configured base URL"}`,
    }));
  }

  for (const entry of configuredEntries.length ? configuredEntries : [{ id: "gpt-5.4", tasks: ["chat", "copywriting", "strategy", "campaign_generation", "social_generation", "email_generation"] as AITask[] }]) {
    const descriptor = buildDescriptor({
      id: entry.id,
      provider: "genx",
      source: descriptors.has(entry.id) ? "live_discovery" : "task_config",
      explicitTasks: entry.tasks,
      routeReason: descriptors.has(entry.id)
        ? "GenX configured task model matched live /models discovery"
        : "GenX configured/backward-compatible task model fallback",
    });
    const existing = descriptors.get(entry.id);
    descriptors.set(entry.id, existing
      ? {
        ...existing,
        source: existing.source === "live_discovery" ? "live_discovery" : descriptor.source,
        executableTasks: Array.from(new Set([...existing.executableTasks, ...descriptor.executableTasks])),
        categories: Array.from(new Set([...existing.categories, ...descriptor.categories])),
        qualityTiers: Array.from(new Set([...existing.qualityTiers, ...descriptor.qualityTiers])),
        multimodal: existing.multimodal || descriptor.multimodal,
        suitabilityScore: Math.max(existing.suitabilityScore, descriptor.suitabilityScore),
        routeReason: descriptor.routeReason,
      }
      : descriptor);
  }

  // If no specialist media model is configured, add the fallback model as a candidate for all
  // GenX media tasks via the /api/v1/generate endpoint. GenX /v1/models only exposes chat models
  // but the generate endpoint accepts any configured model for media tasks.
  const hasMediaCandidate = Array.from(descriptors.values()).some(
    (d) => d.executableTasks.some((t) => MEDIA_TASKS.has(t)),
  );
  if (!hasMediaCandidate) {
    const fallbackId = configuredEntries[0]?.id ?? "gpt-5.4";
    const mediaRouteReason = `GenX /v1/models did not expose specialist media model IDs, using GenX generate endpoint fallback model ${fallbackId}.`;
    const mediaDescriptor = buildDescriptor({
      id: fallbackId,
      provider: "genx",
      source: descriptors.has(fallbackId) ? "live_discovery" : "fallback",
      explicitTasks: Array.from(MEDIA_TASKS) as AITask[],
      routeReason: mediaRouteReason,
    });
    const existing = descriptors.get(fallbackId);
    descriptors.set(fallbackId, existing
      ? {
        ...existing,
        executableTasks: Array.from(new Set([...existing.executableTasks, ...mediaDescriptor.executableTasks])),
        categories: Array.from(new Set([...existing.categories, ...mediaDescriptor.categories])),
        qualityTiers: Array.from(new Set([...existing.qualityTiers, ...mediaDescriptor.qualityTiers])),
        multimodal: true,
        suitabilityScore: Math.max(existing.suitabilityScore, mediaDescriptor.suitabilityScore),
      }
      : mediaDescriptor);
  }

  return Array.from(descriptors.values());
}

const HF_TASK_TO_CATEGORY: Partial<Record<AITask, CapabilityCategory>> = {
  copywriting: "copywriting",
  chat: "reasoning",
  strategy: "strategy",
  campaign_generation: "campaign_generation",
  social_generation: "social_generation",
  email_generation: "email_generation",
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
  analytics: "analytics",
};

async function discoverHuggingFaceTaskModels(): Promise<ProviderModelDescriptor[]> {
  const taskModels = await Promise.all(
    Object.entries(HF_TASK_TO_CATEGORY).map(async ([task, category]) => {
      if (!category) return null;
      const models = await resolveHuggingFaceTaskModels(task as AITask);
      if (!models.length) return null;
      return models.map((model) => {
        const descriptor = buildDescriptor({
          id: model,
          provider: "huggingface",
          source: "task_config",
          explicitTasks: [task as AITask],
          routeReason: `Hugging Face task model configured for ${task}`,
        });
        descriptor.categories = Array.from(new Set([...descriptor.categories, category]));
        descriptor.multimodal = isMultimodal(model, descriptor.categories);
        descriptor.suitabilityScore = scoreModelSuitability(model, descriptor.categories);
        return descriptor;
      });
    }),
  );

  const deduped = new Map<string, ProviderModelDescriptor>();
  for (const itemGroup of taskModels) {
    if (!itemGroup) continue;
    for (const item of itemGroup) {
      const existing = deduped.get(item.id);
    if (!existing) {
      deduped.set(item.id, item);
      continue;
    }
    deduped.set(item.id, {
      ...existing,
      categories: Array.from(new Set([...existing.categories, ...item.categories])),
      executableTasks: Array.from(new Set([...existing.executableTasks, ...item.executableTasks])),
      suitabilityScore: Math.max(existing.suitabilityScore, item.suitabilityScore),
      multimodal: existing.multimodal || item.multimodal,
      qualityTiers: Array.from(new Set([...existing.qualityTiers, ...item.qualityTiers])),
    });
    }
  }

  return Array.from(deduped.values());
}

async function discoverQwenModels(): Promise<ProviderModelDescriptor[]> {
  const keys: Array<{ task: AITask; setting: string; env: string }> = [
    { task: "copywriting", setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
    { task: "strategy", setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
    { task: "campaign_generation", setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
    { task: "social_generation", setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
    { task: "email_generation", setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
    { task: "image_captioning", setting: "qwen_vision_model", env: "QWEN_VISION_MODEL" },
    { task: "text_to_image", setting: "qwen_image_model", env: "QWEN_IMAGE_MODEL" },
    { task: "text_to_video", setting: "qwen_video_model", env: "QWEN_VIDEO_MODEL" },
    { task: "text_to_speech", setting: "qwen_audio_model", env: "QWEN_AUDIO_MODEL" },
    { task: "embeddings", setting: "qwen_embedding_model", env: "QWEN_EMBEDDING_MODEL" },
    { task: "analytics", setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  ];
  const configured = await Promise.all(keys.map(async (entry) => ({
    ...entry,
    model: await getRuntimeConfig(entry.setting, entry.env),
  })));
  const baseModel = (await getRuntimeConfig("qwen_model", "QWEN_MODEL")) || "qwen-plus";
  const models = [
    { id: baseModel, task: "copywriting" as AITask, source: "fallback" as const },
    ...configured
      .filter((entry) => entry.model)
      .map((entry) => ({ id: entry.model, task: entry.task, source: "task_config" as const })),
  ];
  const deduped = new Map<string, ProviderModelDescriptor>();
  for (const model of models) {
    const explicitTasks = isQwenTaskExecutableViaCurrentRuntime(model.task)
      ? model.task === "copywriting"
        ? ["chat", "copywriting", "strategy", "campaign_generation", "social_generation", "email_generation", "classification", "moderation", "analytics"] as AITask[]
        : [model.task]
      : [];
    const descriptor = buildDescriptor({
      id: model.id,
      provider: "qwen",
      source: model.source,
      explicitTasks,
      routeReason: explicitTasks.length
        ? `Qwen ${model.task} model configured for executable OpenAI-compatible route`
        : qwenUnsupportedTaskReason(model.task),
    });
    const existing = deduped.get(descriptor.id);
    if (!existing) {
      deduped.set(descriptor.id, descriptor);
      continue;
    }
    deduped.set(descriptor.id, {
      ...existing,
      categories: Array.from(new Set([...existing.categories, ...descriptor.categories])),
      executableTasks: Array.from(new Set([...existing.executableTasks, ...descriptor.executableTasks])),
      qualityTiers: Array.from(new Set([...existing.qualityTiers, ...descriptor.qualityTiers])),
      multimodal: existing.multimodal || descriptor.multimodal,
      suitabilityScore: Math.max(existing.suitabilityScore, descriptor.suitabilityScore),
    });
  }
  return Array.from(deduped.values());
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

export function categoryForExecutableTask(task: AITask): CapabilityCategory {
  return TASK_TO_CATEGORY[task];
}

export async function resolveModelCandidatesForTask(task: AITask, forceRefresh = false): Promise<ProviderModelCandidate[]> {
  const snapshot = await discoverProviderModels(forceRefresh);
  const category = TASK_TO_CATEGORY[task];
  const providerPreference: Record<AIProviderName, number> = TEXT_TASKS.has(task)
    ? { genx: 100, qwen: 85, huggingface: 65 }
    : { genx: 90, huggingface: 85, qwen: 60 };

  return (Object.values(snapshot.providers).flat() as ProviderModelDescriptor[])
    .filter((model) => model.executableTasks.includes(task))
    .map((model) => ({ ...model, task, category }))
    .sort((a, b) => {
      const providerDelta = (providerPreference[b.provider] ?? 0) - (providerPreference[a.provider] ?? 0);
      if (providerDelta !== 0) return providerDelta;
      return b.suitabilityScore - a.suitabilityScore;
    });
}

export async function getProviderTaskUnavailableReason(provider: AIProviderName, task: AITask): Promise<string> {
  const snapshot = await discoverProviderModels();
  const models = snapshot.providers[provider] ?? [];
  const configured = models.length > 0;
  const modelReason = models
    .map((model) => model.unavailableReasonsByTask?.[task])
    .find(Boolean);
  if (modelReason) return modelReason;
  if (!configured) return `${provider} has no configured or discovered model for ${task}.`;
  return `${provider} has configured models, but none are executable for ${task}.`;
}
