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

const DEFAULT_GENX_BASE_URL = "https://query.genx.sh/v1";
const DEFAULT_MODEL = "gpt-5.4";
const MIN_GENX_MAX_TOKENS = 16;
const DEFAULT_MARKETING_MAX_TOKENS = 512;

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
  text_to_speech: { setting: "genx_tts_model", env: "GENX_TTS_MODEL" },
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
  return {
    model,
    task,
    prompt,
    input: {
      prompt,
      ...(typeof input.image === "string" ? { image: input.image } : {}),
      ...(typeof input.uploadedAssetRef === "string" ? { uploadedAssetRef: input.uploadedAssetRef } : {}),
      ...(typeof input.presenterId === "number" ? { presenterId: input.presenterId } : {}),
    },
    parameters: {
      quality: input.quality ?? "standard",
      platform: input.platform ?? undefined,
      response_format: "url",
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

function normalizeGenXMediaOutput(payload: Record<string, any>, task: AITask): Record<string, unknown> {
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
    ["publicUrl"],
    ["url"],
    ["output_url"],
    ["outputUrl"],
    ["image_url"],
    ["imageUrl"],
    ["video_url"],
    ["videoUrl"],
    ["audio_url"],
    ["audioUrl"],
    ["result", "url"],
    ["result", "output_url"],
    ["data", "0", "url"],
    ["data", "0", "output_url"],
    ["outputs", "0", "url"],
  ]);
  const base64 = firstStringAtPath(payload, [
    ["base64"],
    ["b64_json"],
    ["data", "0", "b64_json"],
    ["result", "base64"],
    ["output", "base64"],
  ]);

  if (url) return { ...payload, url, resultType: "url", task };
  if (base64) {
    const mimeType = task === "text_to_video" || task === "image_to_video" || task === "avatar_video"
      ? "video/mp4"
      : task === "text_to_speech"
        ? "audio/mpeg"
        : "image/png";
    return { ...payload, base64, mimeType, resultType: "base64", task };
  }
  if (providerJobId && (!status || /queued|pending|processing|running|submitted|created/i.test(status))) {
    return { ...payload, providerJobId, providerStatus: status ?? "pending", resultType: "job_pending", task };
  }
  if (providerJobId) {
    return { ...payload, providerJobId, providerStatus: status ?? "unknown", resultType: "job_pending", task };
  }
  return { ...payload, resultType: "failed", error: "GenX media response did not include a playable URL, base64 payload, or provider job id." };
}

export async function resolveGenXConfig(task?: AITask) {
  const key = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");
  const taskModelKeys = task ? GENX_TASK_MODEL_KEYS[task] : undefined;
  const taskModel = taskModelKeys ? await getRuntimeConfig(taskModelKeys.setting, taskModelKeys.env) : "";
  const strategyModel = task === "strategy" || task === "campaign_generation" || task === "classification" || task === "moderation" || task === "embeddings" || task === "analytics"
    ? await getRuntimeConfig("genx_strategy_model", "GENX_STRATEGY_MODEL")
    : "";
  const model = taskModel || strategyModel || (await getRuntimeConfig("genx_model", "GENX_MODEL")) || DEFAULT_MODEL;
  const baseRaw = (await getRuntimeConfig("genx_base_url", "GENX_BASE_URL")) || DEFAULT_GENX_BASE_URL;
  const base = normalizeBaseUrl(baseRaw, "/v1");
  const endpoint = base ? buildEndpoint(base, "/chat/completions") : "";
  return { key, model, baseRaw, base, endpoint };
}

export async function discoverGenXModelIds(timeoutMs = 12_000): Promise<{
  status: "success" | "failed" | "skipped";
  endpoint: string | null;
  models: string[];
  statusCode?: number | null;
  error?: string;
  latencyMs: number;
}> {
  const startedAt = Date.now();
  const { key, base } = await resolveGenXConfig();
  const endpoint = base ? buildEndpoint(base, "/models") : "";
  if (!key || !endpoint) {
    return {
      status: "skipped",
      endpoint: endpoint || null,
      models: [],
      statusCode: null,
      error: !key ? "Missing GENX_API_KEY or saved genx_api_key." : "GenX base URL is missing or invalid.",
      latencyMs: Date.now() - startedAt,
    };
  }

  try {
    const response = await abortableFetch(
      endpoint,
      {
        method: "GET",
        headers: { authorization: `Bearer ${key}` },
      },
      timeoutMs,
    );
    const payload = await response.json().catch(() => ({})) as { data?: Array<{ id?: string }>; models?: unknown[] };
    if (!response.ok) {
      return {
        status: "failed",
        endpoint,
        models: [],
        statusCode: response.status,
        error: JSON.stringify(payload).slice(0, 500),
        latencyMs: Date.now() - startedAt,
      };
    }
    const rawModels = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.models) ? payload.models : [];
    const models = rawModels
      .map((entry) => typeof entry === "string" ? entry : String((entry as any)?.id ?? ""))
      .map((id) => id.trim())
      .filter(Boolean);
    return {
      status: "success",
      endpoint,
      models,
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    const providerError = toProviderHttpError(error, endpoint, "GenX");
    return {
      status: "failed",
      endpoint,
      models: [],
      statusCode: providerError.status ?? null,
      error: providerError.message,
      latencyMs: Date.now() - startedAt,
    };
  }
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
  if (!model || model === DEFAULT_MODEL) {
    throw new Error(`GenX key is configured, but no ${task}-capable model was found. Configure ${GENX_TASK_MODEL_KEYS[task]?.setting ?? "the GenX media model"} or confirm GenX model metadata.`);
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
