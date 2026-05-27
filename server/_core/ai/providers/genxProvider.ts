import { getRuntimeConfig } from "../../../dynamicConfig";
import type { AITask, TaskExecutionResult } from "../types";
import {
  abortableFetch,
  buildEndpoint,
  normalizeBaseUrl,
  parseUsageFromOpenAI,
  throwForHttpError,
  toProviderHttpError,
} from "./httpUtils";
import { extractImageUrl, validateTaskInputForModel } from "../taskModelPolicy";

const DEFAULT_GENX_BASE_URL = "https://query.genx.sh/v1";
const DEFAULT_MODEL = "gpt-5.4";
const MIN_GENX_MAX_TOKENS = 16;
const DEFAULT_MARKETING_MAX_TOKENS = 512;
const VIDEO_MODEL_HINT = /(video|veo|kling|pixverse|seedance|runway|sora|t2v|i2v|image-?to-?video|imagine-video|wan|hailuo|pika|minimax)/i;
const IMAGE_MODEL_HINT = /(image|img|recraft|flux|nano-banana|dall|gpt-image|stable[-_]?diffusion|diffusion|imagen|imagine(?!-video)|genxlm-.*img)/i;
const VOICE_MODEL_HINT = /(voice|tts|aura|grok-tts|speech)/i;
const AUDIO_MODEL_HINT = /(audio|music|lyria|sound|speech|tts)/i;
const AVATAR_MODEL_HINT = /(avatar|talking[-_ ]head|presenter)/i;
const IMAGE_TO_VIDEO_HINT = /(i2v|image-?to-?video|image2video|img2video)/i;
const TEXT_FOUNDATION_HINT = /(gpt|claude|gemini|llama|mistral|qwen|sonnet|chat)/i;

const GENX_TASK_MODEL_KEYS: Partial<Record<AITask, { setting: string; env: string }>> = {
  chat: { setting: "genx_text_model", env: "GENX_TEXT_MODEL" },
  copywriting: { setting: "genx_text_model", env: "GENX_TEXT_MODEL" },
  strategy: { setting: "genx_strategy_model", env: "GENX_STRATEGY_MODEL" },
  campaign_generation: { setting: "genx_strategy_model", env: "GENX_STRATEGY_MODEL" },
  social_generation: { setting: "genx_text_model", env: "GENX_TEXT_MODEL" },
  email_generation: { setting: "genx_text_model", env: "GENX_TEXT_MODEL" },
  classification: { setting: "genx_strategy_model", env: "GENX_STRATEGY_MODEL" },
  moderation: { setting: "genx_strategy_model", env: "GENX_STRATEGY_MODEL" },
  text_to_image: { setting: "genx_image_model", env: "GENX_IMAGE_MODEL" },
  image_edit: { setting: "genx_image_model", env: "GENX_IMAGE_MODEL" },
  text_to_video: { setting: "genx_video_model", env: "GENX_VIDEO_MODEL" },
  image_to_video: { setting: "genx_video_model", env: "GENX_VIDEO_MODEL" },
  avatar_video: { setting: "genx_avatar_model", env: "GENX_AVATAR_MODEL" },
  text_to_speech: { setting: "genx_voice_model", env: "GENX_VOICE_MODEL" },
  speech_to_text: { setting: "genx_vision_model", env: "GENX_VISION_MODEL" },
  image_captioning: { setting: "genx_vision_model", env: "GENX_VISION_MODEL" },
  embeddings: { setting: "genx_strategy_model", env: "GENX_STRATEGY_MODEL" },
  analytics: { setting: "genx_strategy_model", env: "GENX_STRATEGY_MODEL" },
};

const GENX_CHAT_TASKS = new Set<AITask>([
  "chat",
  "copywriting",
  "strategy",
  "campaign_generation",
  "social_generation",
  "email_generation",
  "classification",
  "moderation",
  "analytics",
  "image_captioning",
]);

const GENX_MEDIA_TASKS = new Set<AITask>([
  "text_to_image",
  "image_edit",
  "text_to_video",
  "image_to_video",
  "avatar_video",
  "text_to_speech",
]);

export function clampGenXMaxTokens(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : DEFAULT_MARKETING_MAX_TOKENS;
  return Math.max(MIN_GENX_MAX_TOKENS, numeric);
}

function stripV1Suffix(baseUrl: string): string {
  return baseUrl.replace(/\/v1$/i, "").replace(/\/+$/, "");
}

function mediaEndpointFromBase(baseUrl: string): string {
  return buildEndpoint(stripV1Suffix(baseUrl), "/api/v1/generate");
}

function promptForMediaTask(task: AITask, input: Record<string, unknown>): string {
  if (task === "avatar_video") return String(input.script ?? input.prompt ?? "");
  if (task === "text_to_speech") return String(input.text ?? input.prompt ?? "");
  return String(input.prompt ?? "");
}

function mediaPayloadForTask(task: AITask, model: string, input: Record<string, unknown>) {
  const prompt = promptForMediaTask(task, input);
  const imageUrl = extractImageUrl(input);
  const duration = typeof input.duration === "number" && Number.isFinite(input.duration)
    ? input.duration
    : undefined;
  const aspectRatio = typeof input.aspect_ratio === "string"
    ? input.aspect_ratio
    : typeof input.aspectRatio === "string"
      ? input.aspectRatio
      : undefined;
  return {
    model,
    task,
    params: {
      prompt,
      input: prompt,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(typeof input.image === "string" ? { image: input.image } : {}),
      ...(typeof input.uploadedAssetRef === "string" ? { uploadedAssetRef: input.uploadedAssetRef } : {}),
      ...((typeof input.presenterId === "number" && Number.isFinite(input.presenterId)) || typeof input.presenterId === "string"
        ? { presenterId: input.presenterId }
        : {}),
      quality: input.quality ?? "standard",
      ...(typeof input.platform === "string" ? { platform: input.platform } : {}),
      response_format: "url",
      ...(typeof input.voice_id === "string" ? { voice_id: input.voice_id } : {}),
      ...(typeof input.voiceId === "string" ? { voice_id: input.voiceId } : {}),
      ...((task === "text_to_video" || task === "image_to_video" || task === "avatar_video") && duration !== undefined
        ? { duration }
        : {}),
      ...((task === "text_to_video" || task === "image_to_video" || task === "avatar_video") && aspectRatio
        ? { aspect_ratio: aspectRatio }
        : {}),
    },
  };
}

function firstStringAtPath(payload: any, paths: string[][]): string | null {
  for (const path of paths) {
    let current = payload;
    for (const key of path) {
      current = Array.isArray(current) ? current[Number(key)] : current?.[key];
    }
    if (typeof current === "string" && current.trim()) return current.trim();
  }
  return null;
}

function extractGenXJobIdFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const match = parsed.pathname.match(/\/api\/v1\/jobs\/([^/]+)\/?$/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function normalizeGenXMediaOutput(payload: Record<string, any>, task: AITask): Record<string, unknown> {
  const inlineFile = payload?.file;
  const nestedFile = payload?.output?.file;
  const fileString = typeof inlineFile === "string"
    ? inlineFile
    : typeof nestedFile === "string"
      ? nestedFile
      : null;
  const providerJobId = firstStringAtPath(payload, [
    ["providerJobId"],
    ["job_id"],
    ["jobId"],
    ["id"],
    ["data", "0", "id"],
    ["result", "id"],
  ]);
  const status = firstStringAtPath(payload, [
    ["status"],
    ["state"],
    ["providerStatus"],
    ["data", "0", "status"],
    ["result", "status"],
  ]);
  const url = firstStringAtPath(payload, [
    ["result_url"],
    ["publicUrl"],
    ["url"],
    ["result_url"],
    ["resultUrl"],
    ["output_url"],
    ["outputUrl"],
    ["image_url"],
    ["imageUrl"],
    ["video_url"],
    ["videoUrl"],
    ["audio_url"],
    ["audioUrl"],
    ["result", "url"],
    ["result", "result_url"],
    ["result", "output_url"],
    ["output", "url"],
    ["output", "output_url"],
    ["output", "public_url"],
    ["file", "url"],
    ["file", "output_url"],
    ["data", "0", "url"],
    ["data", "0", "output_url"],
    ["outputs", "0", "url"],
  ]);
  const mimeType = firstStringAtPath(payload, [
    ["mimeType"],
    ["mime_type"],
    ["content_type"],
    ["file", "mimeType"],
    ["file", "mime_type"],
    ["output", "mimeType"],
    ["output", "mime_type"],
  ]);
  const base64 = firstStringAtPath(payload, [
    ["base64"],
    ["b64_json"],
    ["file", "base64"],
    ["file", "data"],
    ["data", "0", "b64_json"],
    ["result", "base64"],
    ["output", "base64"],
  ]);

  if (url) {
    if (url.startsWith("data:text/plain")) {
      return {
        ...payload,
        url,
        mimeType: "text/plain",
        resultType: "failed",
        providerStatus: status ?? "completed",
        task,
        source: "app_genx_media_job",
        videoPlan: url,
        error: "Provider returned text/plain planning output, not playable media.",
      };
    }
    const providerJobFromUrl = extractGenXJobIdFromUrl(url);
    if (providerJobFromUrl) {
      return {
        ...payload,
        providerJobId: providerJobId ?? providerJobFromUrl,
        providerStatus: status ?? "pending",
        resultType: "job_pending",
        task,
        source: "app_genx_media_job",
      };
    }
    return { ...payload, url, mimeType, resultType: "url", task, source: "app_genx_media_job" };
  }
  if (fileString && /^https?:\/\//i.test(fileString)) {
    return { ...payload, url: fileString, mimeType, resultType: "url", task, source: "app_genx_media_job" };
  }
  const dataUrlMatch = fileString?.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return { ...payload, base64: dataUrlMatch[2], mimeType: dataUrlMatch[1], resultType: "base64", task, source: "app_genx_media_job" };
  }
  if (base64) {
    const normalizedMimeType = mimeType ?? (task === "text_to_video" || task === "image_to_video" || task === "avatar_video"
      ? "video/mp4"
      : task === "text_to_speech"
        ? "audio/mpeg"
        : "image/png");
    return { ...payload, base64, mimeType: normalizedMimeType, resultType: "base64", task, source: "app_genx_media_job" };
  }
  if (providerJobId && (!status || /queued|pending|processing|running|submitted|created/i.test(status))) {
    return { ...payload, providerJobId, providerStatus: status ?? "pending", resultType: "job_pending", task, source: "app_genx_media_job" };
  }
  if (providerJobId) {
    return { ...payload, providerJobId, providerStatus: status ?? "unknown", resultType: "job_pending", task, source: "app_genx_media_job" };
  }
  return { ...payload, resultType: "failed", error: "GenX media response did not include a playable URL, base64 payload, or provider job id.", source: "app_genx_media_job" };
}

export async function resolveGenXConfig(task?: AITask) {
  const key = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");
  const taskModelKeys = task ? GENX_TASK_MODEL_KEYS[task] : undefined;
  const taskModel = taskModelKeys ? await getRuntimeConfig(taskModelKeys.setting, taskModelKeys.env) : "";
  const taskModelFallback = task === "text_to_speech"
    ? (await getRuntimeConfig("genx_audio_model", "GENX_AUDIO_MODEL"))
      || (await getRuntimeConfig("genx_tts_model", "GENX_TTS_MODEL"))
    : "";
  const strategyModel = task === "strategy" || task === "campaign_generation" || task === "classification" || task === "moderation" || task === "embeddings" || task === "analytics"
    ? await getRuntimeConfig("genx_strategy_model", "GENX_STRATEGY_MODEL")
    : "";
  const model = taskModel
    || taskModelFallback
    || strategyModel
    || (await getRuntimeConfig("genx_default_model", "GENX_DEFAULT_MODEL"))
    || (await getRuntimeConfig("genx_model", "GENX_MODEL"))
    || DEFAULT_MODEL;
  const baseRaw = (await getRuntimeConfig("genx_base_url", "GENX_BASE_URL")) || DEFAULT_GENX_BASE_URL;
  const base = normalizeBaseUrl(baseRaw, "/v1");
  const endpoint = base ? buildEndpoint(base, "/chat/completions") : "";
  return { key, model, baseRaw, base, endpoint };
}

function normalizeDiscoveredModelIds(payload: unknown): string[] {
  const entries = normalizeDiscoveredModelEntries(payload);
  return entries
    .map((entry) => entry.id)
    .map((id) => id.trim())
    .filter(Boolean);
}

type NormalizedDiscoveredModelEntry = { id: string; raw: unknown };

function normalizeDiscoveredModelEntries(payload: unknown): NormalizedDiscoveredModelEntry[] {
  const obj = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const rawModels = Array.isArray(payload)
    ? payload
    : Array.isArray(obj.data)
      ? obj.data
      : Array.isArray(obj.models)
        ? obj.models
        : [];

  return rawModels
    .map((entry) => {
      if (typeof entry === "string") return { id: entry.trim(), raw: entry };
      if (entry && typeof entry === "object") {
        const item = entry as Record<string, unknown>;
        const id = String(item.id ?? item.model ?? item.name ?? "").trim();
        return { id, raw: entry };
      }
      return { id: "", raw: entry };
    })
    .filter((entry) => Boolean(entry.id));
}

export type GenXModelCategory = "text" | "image" | "video" | "voice" | "audio" | "catalogue" | "compatibility";

export type GenXModelCapabilityFlags = {
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsVoice: boolean;
  supportsAudio: boolean;
  supportsAvatar: boolean;
  supportsImageToVideo: boolean;
  supportsPlayableMedia: boolean;
  videoPromptOnly: boolean;
};

export type GenXDiscoveredModel = GenXModelCapabilityFlags & {
  id: string;
  category: GenXModelCategory;
  provider: "genx";
  endpointFamily: "openai_chat" | "genx_async_job";
  raw: unknown;
};

export function deriveGenXCapabilityFlags(modelIdRaw: string, category?: GenXModelCategory): GenXModelCapabilityFlags {
  const modelId = modelIdRaw.toLowerCase();
  const supportsVideo = category === "video" || VIDEO_MODEL_HINT.test(modelId);
  const supportsImage = category === "image" || IMAGE_MODEL_HINT.test(modelId);
  const supportsVoice = category === "voice" || VOICE_MODEL_HINT.test(modelId);
  const supportsAudio = category === "audio" || AUDIO_MODEL_HINT.test(modelId);
  const supportsAvatar = AVATAR_MODEL_HINT.test(modelId);
  const supportsImageToVideo = IMAGE_TO_VIDEO_HINT.test(modelId);
  const supportsPlayableMedia = supportsVideo || supportsImage || supportsVoice || supportsAudio || supportsAvatar;
  const videoPromptOnly = !supportsVideo && !supportsImageToVideo && !supportsAvatar && TEXT_FOUNDATION_HINT.test(modelId);
  return {
    supportsVideo,
    supportsImage,
    supportsVoice,
    supportsAudio,
    supportsAvatar,
    supportsImageToVideo,
    supportsPlayableMedia,
    videoPromptOnly,
  };
}

async function discoverGenXModelsAtEndpoint(endpoint: string, key: string, timeoutMs: number) {
  const response = await abortableFetch(
    endpoint,
    {
      method: "GET",
      headers: { authorization: "Bearer " + key },
    },
    timeoutMs,
  );
  const payload = await response.json().catch(() => ({}));
  const entries = normalizeDiscoveredModelEntries(payload);
  return {
    ok: response.ok,
    statusCode: response.status,
    payload,
    entries: response.ok ? entries : [],
    models: response.ok ? normalizeDiscoveredModelIds(payload) : [],
  };
}

export type GenXModelCatalogueDiscovery = {
  status: "success" | "failed" | "skipped";
  endpoint: {
    catalogue: string | null;
    categories: Partial<Record<"text" | "image" | "video" | "voice" | "audio", string | null>>;
    compatibility: string | null;
  };
  models: string[];
  compatibilityModels: string[];
  categoryModels: Record<"text" | "image" | "video" | "voice" | "audio", string[]>;
  normalizedModels: GenXDiscoveredModel[];
  statusCode?: number | null;
  categoryStatusCodes?: Partial<Record<"text" | "image" | "video" | "voice" | "audio", number | null>>;
  error?: string;
  latencyMs: number;
};

export async function discoverGenXModelCatalogue(timeoutMs = 12_000): Promise<GenXModelCatalogueDiscovery> {
  const startedAt = Date.now();
  const { key, base } = await resolveGenXConfig();
  const baseRoot = base ? stripV1Suffix(base) : "";
  const catalogueEndpoint = baseRoot ? buildEndpoint(baseRoot, "/api/v1/models") : "";
  const compatibilityEndpoint = base ? buildEndpoint(base, "/models") : "";
  const categories = ["text", "image", "video", "voice", "audio"] as const;
  const categoryEndpoints = Object.fromEntries(
    categories.map((category) => [category, catalogueEndpoint ? `${catalogueEndpoint}?category=${category}` : ""]),
  ) as Record<(typeof categories)[number], string>;

  if (!key || !catalogueEndpoint) {
    return {
      status: "skipped",
      endpoint: {
        catalogue: catalogueEndpoint || null,
        categories: Object.fromEntries(categories.map((category) => [category, categoryEndpoints[category] || null])),
        compatibility: compatibilityEndpoint || null,
      },
      models: [],
      compatibilityModels: [],
      categoryModels: { text: [], image: [], video: [], voice: [], audio: [] },
      normalizedModels: [],
      statusCode: null,
      categoryStatusCodes: {},
      error: !key ? "Missing GENX_API_KEY or saved genx_api_key." : "GenX base URL is missing or invalid.",
      latencyMs: Date.now() - startedAt,
    };
  }

  try {
    const catalogueResponse = await discoverGenXModelsAtEndpoint(catalogueEndpoint, key, timeoutMs);
    if (!catalogueResponse.ok) {
      return {
        status: "failed",
        endpoint: {
          catalogue: catalogueEndpoint,
          categories: Object.fromEntries(categories.map((category) => [category, categoryEndpoints[category]])),
          compatibility: compatibilityEndpoint || null,
        },
        models: [],
        compatibilityModels: [],
        categoryModels: { text: [], image: [], video: [], voice: [], audio: [] },
        normalizedModels: [],
        statusCode: catalogueResponse.statusCode,
        categoryStatusCodes: {},
        error: JSON.stringify(catalogueResponse.payload).slice(0, 500),
        latencyMs: Date.now() - startedAt,
      };
    }

    const categoryResponses = await Promise.all(
      categories.map(async (category) => {
        try {
          const response = await discoverGenXModelsAtEndpoint(categoryEndpoints[category], key, timeoutMs);
          return [category, { statusCode: response.statusCode, models: response.models }] as const;
        } catch {
          return [category, { statusCode: null, models: [] }] as const;
        }
      }),
    );
    const categoryLookup = Object.fromEntries(categoryResponses) as Record<(typeof categories)[number], { statusCode: number | null; models: string[] }>;

    let compatibilityModels: string[] = [];
    let compatibilityEntries: NormalizedDiscoveredModelEntry[] = [];
    if (compatibilityEndpoint) {
      try {
        const compatibilityResponse = await discoverGenXModelsAtEndpoint(compatibilityEndpoint, key, timeoutMs);
        compatibilityModels = compatibilityResponse.models;
        compatibilityEntries = compatibilityResponse.entries;
      } catch {
        compatibilityModels = [];
        compatibilityEntries = [];
      }
    }

    const normalizedModels: GenXDiscoveredModel[] = [];
    const normalizedKeySet = new Set<string>();
    const pushNormalized = (id: string, category: GenXModelCategory, raw: unknown) => {
      const dedupeKey = `${category}:${id}`;
      if (normalizedKeySet.has(dedupeKey)) return;
      normalizedKeySet.add(dedupeKey);
      const capabilities = deriveGenXCapabilityFlags(id, category);
      normalizedModels.push({
        id,
        category,
        provider: "genx",
        endpointFamily:
          category === "text"
            ? "openai_chat"
            : category === "image" || category === "video" || category === "voice" || category === "audio"
              ? "genx_async_job"
              : capabilities.supportsPlayableMedia
                ? "genx_async_job"
                : "openai_chat",
        raw,
        ...capabilities,
      });
    };

    for (const entry of catalogueResponse.entries) {
      pushNormalized(entry.id, "catalogue", entry.raw);
    }
    for (const [category, lookup] of Object.entries(categoryLookup) as Array<[GenXModelCategory, { statusCode: number | null; models: string[] }]>) {
      for (const id of lookup.models) {
        pushNormalized(id, category, { id });
      }
    }
    for (const entry of compatibilityEntries) {
      pushNormalized(entry.id, "compatibility", entry.raw);
    }

    return {
      status: "success",
      endpoint: {
        catalogue: catalogueEndpoint,
        categories: Object.fromEntries(categories.map((category) => [category, categoryEndpoints[category]])),
        compatibility: compatibilityEndpoint || null,
      },
      models: catalogueResponse.models,
      compatibilityModels,
      categoryModels: {
        text: categoryLookup.text.models,
        image: categoryLookup.image.models,
        video: categoryLookup.video.models,
        voice: categoryLookup.voice.models,
        audio: categoryLookup.audio.models,
      },
      normalizedModels,
      statusCode: catalogueResponse.statusCode,
      categoryStatusCodes: {
        text: categoryLookup.text.statusCode,
        image: categoryLookup.image.statusCode,
        video: categoryLookup.video.statusCode,
        voice: categoryLookup.voice.statusCode,
        audio: categoryLookup.audio.statusCode,
      },
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    const providerError = toProviderHttpError(error, catalogueEndpoint, "GenX");
    return {
      status: "failed",
      endpoint: {
        catalogue: catalogueEndpoint,
        categories: Object.fromEntries(categories.map((category) => [category, categoryEndpoints[category]])),
        compatibility: compatibilityEndpoint || null,
      },
      models: [],
      compatibilityModels: [],
      categoryModels: { text: [], image: [], video: [], voice: [], audio: [] },
      normalizedModels: [],
      statusCode: providerError.status ?? null,
      categoryStatusCodes: {},
      error: providerError.message,
      latencyMs: Date.now() - startedAt,
    };
  }
}

export async function discoverGenXModelIds(timeoutMs = 12_000): Promise<{
  status: "success" | "failed" | "skipped";
  endpoint: string | null;
  models: string[];
  statusCode?: number | null;
  error?: string;
  latencyMs: number;
}> {
  const discovery = await discoverGenXModelCatalogue(timeoutMs);
  return {
    status: discovery.status,
    endpoint: discovery.endpoint.compatibility ?? discovery.endpoint.catalogue,
    models: discovery.compatibilityModels.length ? discovery.compatibilityModels : discovery.models,
    statusCode: discovery.statusCode,
    error: discovery.error,
    latencyMs: discovery.latencyMs,
  };
}

export async function executeGenXTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  if (GENX_MEDIA_TASKS.has(task)) {
    return executeGenXMediaTask(task, input, timeoutMs);
  }
  if (!GENX_CHAT_TASKS.has(task)) {
    throw new Error(`GenX task "${task}" is not executable through the current GenX adapter.`);
  }
  const { key, model: configuredModel, endpoint } = await resolveGenXConfig(task);
  const model = typeof input.model === "string" && input.model.trim() ? input.model.trim() : configuredModel;
  if (!key) {
    throw new Error("GenX provider is not configured");
  }
  if (!endpoint) {
    throw new Error("GenX base URL not reachable. Use Developer Diagnostics if the default GenX route is unavailable.");
  }
  const startedAt = Date.now();

  try {
    const messages = (Array.isArray(input.messages) && input.messages.length > 0)
      ? input.messages
      : [{ role: "user", content: String(input.prompt ?? "") }];
    const response = await abortableFetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: typeof input.temperature === "number" ? input.temperature : 0.4,
          max_tokens: clampGenXMaxTokens(input.max_tokens ?? input.maxTokens),
          task,
        }),
      },
      timeoutMs,
    );

    await throwForHttpError(response, "GenX", endpoint);
    const payload = (await response.json()) as Record<string, any>;
    const usage = parseUsageFromOpenAI(payload);

    // Pass through async/provider job hints when available
    const providerJobId = typeof payload?.job_id === "string" ? payload.job_id : undefined;
    const providerStatus = typeof payload?.status === "string" ? payload.status : undefined;
    const output = providerJobId
      ? { ...payload, providerJobId, providerStatus, resultType: "job_pending" }
      : payload;

    return {
      provider: "genx",
      task,
      model,
      output,
      usage,
      latencyMs: Date.now() - startedAt,
      resultType: providerJobId ? "provider_job_pending" : "json",
      routeReason: `GenX OpenAI-compatible chat selected model ${model} for ${task}`,
      endpointFamily: "openai_chat",
    };
  } catch (error) {
    throw toProviderHttpError(error, endpoint, "GenX");
  }
}

export async function executeGenXMediaTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const { key, model: configuredModel, base } = await resolveGenXConfig(task);
  const model = typeof input.model === "string" && input.model.trim() ? input.model.trim() : configuredModel;
  if (!key) {
    throw new Error("GenX provider is not configured");
  }
  if (!base) {
    throw new Error("GenX base URL not reachable. Use Developer Diagnostics if the default GenX route is unavailable.");
  }
  if (!model) {
    throw new Error(`GenX key is configured, but no ${task}-capable model was found. Configure ${GENX_TASK_MODEL_KEYS[task]?.setting ?? "the GenX media model"} or confirm GenX model metadata.`);
  }
  const guard = validateTaskInputForModel(task, model, input);
  if (!guard.ok) {
    throw new Error(`setup_needed: ${guard.message}`);
  }
  if (model.toLowerCase() === "grok-tts" && !input.voice_id && !input.voiceId) {
    const voices = await discoverGenXVoices(model, key, base, timeoutMs);
    throw new Error(`setup_needed: ${model} requires voice_id. Available voices: ${voices.length ? voices.join(", ") : "none returned by provider"}.`);
  }

  const endpoint = mediaEndpointFromBase(base);
  const startedAt = Date.now();
  try {
    const response = await abortableFetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(mediaPayloadForTask(task, model, input)),
      },
      timeoutMs,
    );

    await throwForHttpError(response, "GenX", endpoint);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.startsWith("text/plain")) {
      const text = await response.text().catch(() => "");
      const isMediaTask = task === "text_to_video" || task === "image_to_video" || task === "avatar_video";
      const output = isMediaTask
        ? {
          resultType: "video_plan",
          status: "needs_render_model",
          mimeType: "text/plain",
          notes: text,
          text,
          task,
          source: "app_genx_media_job",
        }
        : {
          resultType: "text",
          mimeType: "text/plain",
          text,
          task,
          source: "app_genx_media_job",
        };
      return {
        provider: "genx",
        task,
        model,
        output,
        latencyMs: Date.now() - startedAt,
        resultType: "failed",
        routeReason: `GenX media endpoint selected model ${model} for ${task}`,
        endpointFamily: "genx_async_job",
      };
    }
    if (contentType.startsWith("image/") || contentType.startsWith("video/") || contentType.startsWith("audio/")) {
      const arrayBuffer = await response.arrayBuffer();
      return {
        provider: "genx",
        task,
        model,
        output: {
          resultType: "base64",
          mimeType: contentType.split(";")[0],
          base64: Buffer.from(arrayBuffer).toString("base64"),
          task,
          source: "app_genx_media_job",
        },
        latencyMs: Date.now() - startedAt,
        resultType: "base64",
        routeReason: `GenX media endpoint selected model ${model} for ${task}`,
        endpointFamily: "genx_async_job",
      };
    }

    const payload = (await response.json().catch(async () => ({ text: await response.text().catch(() => "") }))) as Record<string, any>;
    const output = normalizeGenXMediaOutput(payload, task);
    const resultType = output.resultType === "job_pending"
      ? "provider_job_pending"
      : output.resultType === "url"
        ? "url"
        : output.resultType === "base64"
          ? "base64"
          : "failed";
    return {
      provider: "genx",
      task,
      model,
      output,
      latencyMs: Date.now() - startedAt,
      resultType,
      routeReason: `GenX media endpoint selected model ${model} for ${task}`,
      endpointFamily: "genx_async_job",
    };
  } catch (error) {
    throw toProviderHttpError(error, endpoint, "GenX");
  }
}

async function discoverGenXVoices(model: string, key: string, base: string, timeoutMs: number): Promise<string[]> {
  const endpoint = buildEndpoint(stripV1Suffix(base), `/api/v1/models/${encodeURIComponent(model)}/voices`);
  try {
    const response = await abortableFetch(endpoint, { method: "GET", headers: { authorization: `Bearer ${key}` } }, timeoutMs);
    await throwForHttpError(response, "GenX", endpoint);
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    const raw = Array.isArray(payload.voices) ? payload.voices : Array.isArray(payload.data) ? payload.data : [];
    return raw
      .map((entry) => typeof entry === "string" ? entry : String(entry?.id ?? entry?.voice_id ?? entry?.name ?? ""))
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function testRawGenXConnection(timeoutMs = 12_000) {
  const startedAt = Date.now();
  const { key, model, base, endpoint } = await resolveGenXConfig();
  if (!key) {
    return {
      provider: "genx" as const,
      status: "missing_key" as const,
      endpoint: endpoint || null,
      statusCode: null,
      latencyMs: 0,
      responseSummary: "Missing GENX_API_KEY or saved genx_api_key.",
    };
  }
  if (!base || !endpoint) {
    return {
      provider: "genx" as const,
      status: "missing_base_url" as const,
      endpoint: null,
      statusCode: null,
      latencyMs: 0,
      responseSummary: "GenX base URL not reachable. Use Developer Diagnostics if the default GenX route is unavailable.",
    };
  }

  try {
    const response = await abortableFetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: "Reply with one short sentence confirming GenX connectivity.",
            },
          ],
          temperature: 0.1,
          max_tokens: 32,
        }),
      },
      timeoutMs,
    );

    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    return {
      provider: "genx" as const,
      status: response.ok ? "success" as const : "failed" as const,
      endpoint,
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
      responseSummary: `${contentType || "unknown"} ${body.slice(0, 500)}`.trim(),
    };
  } catch (error) {
    const providerError = toProviderHttpError(error, endpoint, "GenX");
    return {
      provider: "genx" as const,
      status: "failed" as const,
      endpoint,
      statusCode: providerError.status ?? null,
      latencyMs: Date.now() - startedAt,
      responseSummary: providerError.message,
    };
  }
}

const GENX_JOB_ENDPOINTS = {
  status: (base: string, jobId: string) => buildEndpoint(base, `/api/v1/jobs/${encodeURIComponent(jobId)}`),
  result: (base: string, jobId: string) => buildEndpoint(base, `/api/v1/jobs/${encodeURIComponent(jobId)}/result`),
  file: (base: string, jobId: string) => buildEndpoint(base, `/api/v1/jobs/${encodeURIComponent(jobId)}/file`),
};

export type GenXPollResult = {
  status: "resolved" | "pending" | "failed" | "unknown_endpoint";
  resultType: "url" | "base64" | "job_pending" | "failed";
  url?: string;
  base64?: string;
  mimeType?: string;
  providerJobId: string;
  providerStatus?: string;
  diagnostics: string;
  error?: string;
};

export async function pollGenXMediaJob(jobId: string, task: AITask = "text_to_video", timeoutMs = 12_000): Promise<GenXPollResult> {
  const { key, base } = await resolveGenXConfig();
  if (!key || !base) {
    return {
      status: "pending",
      resultType: "job_pending",
      providerJobId: jobId,
      diagnostics: "GenX not configured; cannot poll job status.",
    };
  }
  const baseRoot = stripV1Suffix(base);
  const errors: string[] = [];
  let allNotFound = true;

  const endpointOrder = [GENX_JOB_ENDPOINTS.status(baseRoot, jobId), GENX_JOB_ENDPOINTS.result(baseRoot, jobId), GENX_JOB_ENDPOINTS.file(baseRoot, jobId)];
  for (const endpoint of endpointOrder) {
    try {
      const response = await abortableFetch(
        endpoint,
        { method: "GET", headers: { authorization: `Bearer ${key}` } },
        timeoutMs,
      );

      if (response.status === 404 || response.status === 405) {
        errors.push(`${endpoint}: HTTP ${response.status}`);
        continue;
      }
      allNotFound = false;

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        errors.push(`${endpoint}: HTTP ${response.status} ${errBody.slice(0, 200)}`);
        continue;
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType.startsWith("video/") || contentType.startsWith("image/") || contentType.startsWith("audio/")) {
        const arrayBuffer = await response.arrayBuffer();
        return {
          status: "resolved",
          resultType: "base64",
          base64: Buffer.from(arrayBuffer).toString("base64"),
          mimeType: contentType.split(";")[0],
          providerJobId: jobId,
          diagnostics: `Polled ${endpoint}: resolved with file endpoint payload.`,
        };
      }

      const payload = (await response.json().catch(async () => ({ text: await response.text().catch(() => "") }))) as Record<string, any>;
      if (typeof payload.result_url === "string" && payload.result_url.trim()) {
        const resultUrl = payload.result_url.trim();
        const providerJobFromUrl = extractGenXJobIdFromUrl(resultUrl);
        if (providerJobFromUrl) {
          errors.push(`${endpoint}: result_url pointed to GenX job status endpoint (${resultUrl})`);
          continue;
        }
        return {
          status: "resolved",
          resultType: "url",
          url: resultUrl,
          mimeType: firstStringAtPath(payload, [["mime_type"], ["mimeType"]]) ?? undefined,
          providerJobId: jobId,
          providerStatus: typeof payload.status === "string" ? payload.status : "completed",
          diagnostics: `Polled ${endpoint}: resolved with result_url.`,
        };
      }
      const normalized = normalizeGenXMediaOutput(payload, task);

      if (normalized.resultType === "url") {
        return {
          status: "resolved",
          resultType: "url",
          url: normalized.url as string,
          mimeType: normalized.mimeType as string | undefined,
          providerJobId: jobId,
          providerStatus: typeof normalized.providerStatus === "string" ? normalized.providerStatus : "completed",
          diagnostics: `Polled ${endpoint}: resolved with playable URL.`,
        };
      }
      if (normalized.resultType === "base64") {
        return {
          status: "resolved",
          resultType: "base64",
          base64: normalized.base64 as string,
          mimeType: normalized.mimeType as string | undefined,
          providerJobId: jobId,
          diagnostics: `Polled ${endpoint}: resolved with base64 payload.`,
        };
      }
      if (normalized.resultType === "failed") {
        return {
          status: "failed",
          resultType: "failed",
          providerJobId: jobId,
          error: typeof normalized.error === "string" ? normalized.error : "Provider reported failure.",
          diagnostics: `Polled ${endpoint}: provider reported job failure.`,
        };
      }
      // job_pending
      return {
        status: "pending",
        resultType: "job_pending",
        providerJobId: jobId,
        providerStatus: typeof normalized.providerStatus === "string" ? normalized.providerStatus : undefined,
        diagnostics: `Polled ${endpoint}: job still pending (${typeof normalized.providerStatus === "string" ? normalized.providerStatus : "unknown"}).`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${endpoint}: ${msg}`);
    }
  }

  if (allNotFound) {
    return {
      status: "unknown_endpoint",
      resultType: "job_pending",
      providerJobId: jobId,
      diagnostics: "GenX job polling endpoint not confirmed; all tried endpoints returned 404/405. Job may still be processing.",
    };
  }

  return {
    status: "pending",
    resultType: "job_pending",
    providerJobId: jobId,
    diagnostics: `GenX job polling attempted but did not resolve: ${errors.join("; ")}`,
  };
}

export async function testGenXTextGeneration(timeoutMs = 12_000) {
  const startedAt = Date.now();
  const { model, endpoint } = await resolveGenXConfig();
  const result = await executeGenXTask(
    "copywriting",
    {
      prompt: "Return one short sentence confirming GenX text generation works.",
      temperature: 0.1,
      max_tokens: 60,
    },
    timeoutMs,
  );
  return {
    provider: "genx" as const,
    status: "success" as const,
    model,
    endpoint,
    latencyMs: Date.now() - startedAt,
    preview: typeof result.output === "object"
      ? ((result.output as any)?.choices?.[0]?.message?.content ??
        (result.output as any)?.text ??
        null)
      : null,
  };
}
