import { getRuntimeConfig } from "../../../dynamicConfig";
import type { AITask, TaskExecutionResult } from "../types";
import { promises as dns } from "node:dns";
import {
  abortableFetch,
  throwForHttpError,
  toProviderHttpError,
} from "./httpUtils";

const HUGGINGFACE_INFERENCE_HOST = "api-inference.huggingface.co";

const defaultModelByTask: Partial<Record<AITask, string>> = {
  text_to_image: "black-forest-labs/FLUX.1-schnell",
  text_to_video: "genmo/mochi-1-preview",
  image_to_video: "Wan-AI/Wan2.2-I2V-A14B",
  avatar_video: "Wan-AI/Wan2.2-I2V-A14B",
  image_edit: "stabilityai/stable-diffusion-xl-refiner-1.0",
  image_captioning: "Salesforce/blip-image-captioning-base",
  speech_to_text: "distil-whisper/distil-large-v3",
  text_to_speech: "suno/bark",
  moderation: "unitary/toxic-bert",
  embeddings: "sentence-transformers/all-MiniLM-L6-v2",
};

export const HF_PIPELINE_TASKS = [
  "text-generation",
  "text-to-image",
  "text-to-video",
  "text-to-speech",
  "automatic-speech-recognition",
  "image-to-text",
  "feature-extraction",
  "text-classification",
  "zero-shot-classification",
] as const;

export type HFPipelineTask = (typeof HF_PIPELINE_TASKS)[number];

const DEFAULT_PIPELINE_MODELS: Partial<Record<HFPipelineTask, string>> = {
  "text-generation": "mistralai/Mistral-7B-Instruct-v0.3",
  "text-to-image": "black-forest-labs/FLUX.1-schnell",
  "text-to-video": "genmo/mochi-1-preview",
  "text-to-speech": "suno/bark",
  "automatic-speech-recognition": "distil-whisper/distil-large-v3",
  "image-to-text": "Salesforce/blip-image-captioning-base",
  "feature-extraction": "sentence-transformers/all-MiniLM-L6-v2",
  "text-classification": "facebook/bart-large-mnli",
  "zero-shot-classification": "facebook/bart-large-mnli",
};

const PIPELINE_TASK_TO_KEYS: Record<HFPipelineTask, { model: string; models: string; fallback: string; useDefault: string }> = {
  "text-generation": {
    model: "hf_task_text_generation_model",
    models: "hf_task_text_generation_models",
    fallback: "hf_task_text_generation_fallbacks",
    useDefault: "hf_use_default_text_generation",
  },
  "text-to-image": {
    model: "hf_task_text_to_image_model",
    models: "hf_task_text_to_image_models",
    fallback: "hf_task_text_to_image_fallbacks",
    useDefault: "hf_use_default_text_to_image",
  },
  "text-to-video": {
    model: "hf_task_text_to_video_model",
    models: "hf_task_text_to_video_models",
    fallback: "hf_task_text_to_video_fallbacks",
    useDefault: "hf_use_default_text_to_video",
  },
  "text-to-speech": {
    model: "hf_task_text_to_speech_model",
    models: "hf_task_text_to_speech_models",
    fallback: "hf_task_text_to_speech_fallbacks",
    useDefault: "hf_use_default_text_to_speech",
  },
  "automatic-speech-recognition": {
    model: "hf_task_automatic_speech_recognition_model",
    models: "hf_task_automatic_speech_recognition_models",
    fallback: "hf_task_automatic_speech_recognition_fallbacks",
    useDefault: "hf_use_default_automatic_speech_recognition",
  },
  "image-to-text": {
    model: "hf_task_image_to_text_model",
    models: "hf_task_image_to_text_models",
    fallback: "hf_task_image_to_text_fallbacks",
    useDefault: "hf_use_default_image_to_text",
  },
  "feature-extraction": {
    model: "hf_task_feature_extraction_model",
    models: "hf_task_feature_extraction_models",
    fallback: "hf_task_feature_extraction_fallbacks",
    useDefault: "hf_use_default_feature_extraction",
  },
  "text-classification": {
    model: "hf_task_text_classification_model",
    models: "hf_task_text_classification_models",
    fallback: "hf_task_text_classification_fallbacks",
    useDefault: "hf_use_default_text_classification",
  },
  "zero-shot-classification": {
    model: "hf_task_zero_shot_classification_model",
    models: "hf_task_zero_shot_classification_models",
    fallback: "hf_task_zero_shot_classification_fallbacks",
    useDefault: "hf_use_default_zero_shot_classification",
  },
};

const TASK_MODEL_ENV_KEYS: Partial<Record<AITask, string>> = {
  text_to_image: "HF_TASK_TEXT_TO_IMAGE_MODEL",
  text_to_video: "HF_TASK_TEXT_TO_VIDEO_MODEL",
  image_to_video: "HF_TASK_IMAGE_TO_VIDEO_MODEL",
  text_to_speech: "HF_TASK_TEXT_TO_SPEECH_MODEL",
  avatar_video: "HF_TASK_AVATAR_VIDEO_MODEL",
  speech_to_text: "HF_TASK_SPEECH_TO_TEXT_MODEL",
  image_captioning: "HF_TASK_IMAGE_CAPTIONING_MODEL",
  embeddings: "HF_TASK_EMBEDDINGS_MODEL",
  moderation: "HF_TASK_MODERATION_MODEL",
  classification: "HF_TASK_CLASSIFICATION_MODEL",
  copywriting: "HF_TASK_COPYWRITING_MODEL",
  chat: "HF_TASK_CHAT_MODEL",
  strategy: "HF_TASK_COPYWRITING_MODEL",
  campaign_generation: "HF_TASK_COPYWRITING_MODEL",
  social_generation: "HF_TASK_COPYWRITING_MODEL",
  email_generation: "HF_TASK_COPYWRITING_MODEL",
  analytics: "HF_TASK_CLASSIFICATION_MODEL",
};

const TASK_MODELS_ENV_KEYS: Partial<Record<AITask, string>> = {
  text_to_image: "HF_TASK_TEXT_TO_IMAGE_MODELS",
  text_to_video: "HF_TASK_TEXT_TO_VIDEO_MODELS",
  image_to_video: "HF_TASK_IMAGE_TO_VIDEO_MODELS",
  text_to_speech: "HF_TASK_TEXT_TO_SPEECH_MODELS",
  avatar_video: "HF_TASK_AVATAR_VIDEO_MODELS",
  speech_to_text: "HF_TASK_SPEECH_TO_TEXT_MODELS",
  image_captioning: "HF_TASK_IMAGE_CAPTIONING_MODELS",
  embeddings: "HF_TASK_EMBEDDINGS_MODELS",
  moderation: "HF_TASK_MODERATION_MODELS",
  classification: "HF_TASK_CLASSIFICATION_MODELS",
  copywriting: "HF_TASK_COPYWRITING_MODELS",
  chat: "HF_TASK_CHAT_MODELS",
  strategy: "HF_TASK_COPYWRITING_MODELS",
  campaign_generation: "HF_TASK_COPYWRITING_MODELS",
  social_generation: "HF_TASK_COPYWRITING_MODELS",
  email_generation: "HF_TASK_COPYWRITING_MODELS",
  analytics: "HF_TASK_CLASSIFICATION_MODELS",
};

function splitModelList(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueModels(models: string[]): string[] {
  return Array.from(new Set(models));
}

export type HuggingFaceTaskModelResolution = {
  models: string[];
  source: "explicit_db" | "env" | "built_in_default" | "missing";
  settingKeys: string[];
  envKeys: string[];
};

function huggingFaceAliasTask(task: AITask): AITask {
  if (["strategy", "campaign_generation", "social_generation", "email_generation"].includes(task)) return "copywriting";
  if (task === "analytics") return "classification";
  return task;
}

function pipelineTaskForAiTask(task: AITask): HFPipelineTask | null {
  switch (task) {
    case "chat":
    case "copywriting":
    case "strategy":
    case "campaign_generation":
    case "social_generation":
    case "email_generation":
      return "text-generation";
    case "text_to_image":
      return "text-to-image";
    case "text_to_video":
    case "image_to_video":
    case "avatar_video":
      return "text-to-video";
    case "text_to_speech":
      return "text-to-speech";
    case "speech_to_text":
      return "automatic-speech-recognition";
    case "image_captioning":
      return "image-to-text";
    case "embeddings":
      return "feature-extraction";
    case "classification":
    case "moderation":
    case "analytics":
      return "text-classification";
    default:
      return null;
  }
}

export type HFPipelineRouting = {
  task: HFPipelineTask;
  preferredModel: string | null;
  fallbackModels: string[];
  useDefault: boolean;
  effectiveModels: string[];
};

export async function resolveHuggingFacePipelineRouting(task: HFPipelineTask): Promise<HFPipelineRouting> {
  const keys = PIPELINE_TASK_TO_KEYS[task];
  const [preferred, many, fallback, useDefaultRaw] = await Promise.all([
    getRuntimeConfig(keys.model, keys.model.toUpperCase()),
    getRuntimeConfig(keys.models, keys.models.toUpperCase()),
    getRuntimeConfig(keys.fallback, keys.fallback.toUpperCase()),
    getRuntimeConfig(keys.useDefault, keys.useDefault.toUpperCase()),
  ]);
  const preferredModel = preferred.trim() || null;
  const fallbackModels = uniqueModels([...splitModelList(many), ...splitModelList(fallback)]).filter((model) => model !== preferredModel);
  const useDefault = ["1", "true", "yes", "on"].includes(String(useDefaultRaw).trim().toLowerCase());
  const effectiveModels = uniqueModels([
    ...(preferredModel ? [preferredModel] : []),
    ...fallbackModels,
    ...(useDefault || (!preferredModel && fallbackModels.length === 0) ? (DEFAULT_PIPELINE_MODELS[task] ? [DEFAULT_PIPELINE_MODELS[task]!] : []) : []),
  ]);
  return {
    task,
    preferredModel,
    fallbackModels,
    useDefault,
    effectiveModels,
  };
}

export async function resolveHuggingFaceTaskModelResolution(task: AITask): Promise<HuggingFaceTaskModelResolution> {
  const pipelineTask = pipelineTaskForAiTask(task);
  if (pipelineTask) {
    const pipeline = await resolveHuggingFacePipelineRouting(pipelineTask);
    if (pipeline.effectiveModels.length > 0) {
      const usedBuiltInOnly = !pipeline.preferredModel && pipeline.fallbackModels.length === 0;
      return {
        models: pipeline.effectiveModels,
        source: usedBuiltInOnly ? "built_in_default" : "explicit_db",
        settingKeys: [PIPELINE_TASK_TO_KEYS[pipelineTask].model, PIPELINE_TASK_TO_KEYS[pipelineTask].models, PIPELINE_TASK_TO_KEYS[pipelineTask].fallback, PIPELINE_TASK_TO_KEYS[pipelineTask].useDefault],
        envKeys: [PIPELINE_TASK_TO_KEYS[pipelineTask].model.toUpperCase(), PIPELINE_TASK_TO_KEYS[pipelineTask].models.toUpperCase(), PIPELINE_TASK_TO_KEYS[pipelineTask].fallback.toUpperCase(), PIPELINE_TASK_TO_KEYS[pipelineTask].useDefault.toUpperCase()],
      };
    }
  }

  const aliasTask = huggingFaceAliasTask(task);
  const settingTasks = Array.from(new Set([task, aliasTask]));
  const singleKeys = settingTasks.map((settingTask) => ({
    setting: `hf_task_${settingTask}_model`,
    env: TASK_MODEL_ENV_KEYS[settingTask] ?? `HF_TASK_${settingTask.toUpperCase()}_MODEL`,
  }));
  const listKeys = settingTasks.map((settingTask) => ({
    setting: `hf_task_${settingTask}_models`,
    env: TASK_MODELS_ENV_KEYS[settingTask] ?? `HF_TASK_${settingTask.toUpperCase()}_MODELS`,
  }));
  const keys = [...singleKeys, ...listKeys];
  const configuredValues = await Promise.all(keys.map((entry) => getRuntimeConfig(entry.setting, entry.env)));

  const models = uniqueModels(configuredValues.flatMap(splitModelList));
  if (models.length > 0) {
    const source = keys.some((entry) => process.env[entry.env])
      ? "env"
      : "explicit_db";
    return {
      models,
      source,
      settingKeys: keys.map((entry) => entry.setting),
      envKeys: keys.map((entry) => entry.env),
    };
  }
  if (["copywriting", "chat", "strategy", "campaign_generation", "social_generation", "email_generation", "analytics"].includes(task)) {
    return {
      models: [],
      source: "missing",
      settingKeys: keys.map((entry) => entry.setting),
      envKeys: keys.map((entry) => entry.env),
    };
  }
  const defaultModel = defaultModelByTask[task];
  return {
    models: defaultModel ? [defaultModel] : [],
    source: defaultModel ? "built_in_default" : "missing",
    settingKeys: keys.map((entry) => entry.setting),
    envKeys: keys.map((entry) => entry.env),
  };
}

export async function resolveHuggingFaceTaskModels(task: AITask): Promise<string[]> {
  return (await resolveHuggingFaceTaskModelResolution(task)).models;
}

export async function resolveHuggingFaceTaskModel(task: AITask): Promise<string> {
  return (await resolveHuggingFaceTaskModels(task))[0] ?? "";
}

function buildTaskPayload(task: AITask, input: Record<string, unknown>): Record<string, unknown> {
  switch (task) {
    case "text_to_image":
    case "text_to_video":
      return {
        inputs: String(input.prompt ?? ""),
        parameters: input.parameters ?? {},
      };
    case "image_to_video":
      return {
        inputs: {
          image: input.image,
          prompt: input.prompt ?? "",
        },
        parameters: input.parameters ?? {},
      };
    case "avatar_video":
      return {
        inputs: String(input.script ?? input.prompt ?? ""),
        parameters: {
          style: "avatar",
          ...(typeof input.avatarName === "string" ? { avatarName: input.avatarName } : {}),
          ...(input.parameters && typeof input.parameters === "object" ? input.parameters as Record<string, unknown> : {}),
        },
      };
    case "text_to_speech":
      return { inputs: String(input.text ?? input.prompt ?? "") };
    case "speech_to_text":
      return typeof input.audio === "string"
        ? { inputs: input.audio }
        : { inputs: input.audio ?? input };
    case "image_captioning":
      return typeof input.image === "string"
        ? { inputs: input.image }
        : { inputs: input.image ?? input };
    case "embeddings":
    case "moderation":
    case "classification":
    case "analytics":
      return { inputs: input.input ?? input.prompt ?? input.text ?? "" };
    case "chat":
    case "copywriting":
    case "strategy":
    case "campaign_generation":
    case "social_generation":
    case "email_generation":
    default:
      return {
        inputs: String(input.prompt ?? input.input ?? ""),
        parameters: {
          max_new_tokens: typeof input.max_new_tokens === "number" ? input.max_new_tokens : 512,
          temperature: typeof input.temperature === "number" ? input.temperature : 0.5,
        },
      };
  }
}

function shouldRetryForModelLoading(payload: unknown): { retry: boolean; waitMs: number } {
  if (!payload || typeof payload !== "object") return { retry: false, waitMs: 0 };
  const obj = payload as Record<string, unknown>;
  const estimated = Number(obj.estimated_time ?? 0);
  const error = String(obj.error ?? "").toLowerCase();
  if (estimated > 0 || error.includes("currently loading")) {
    const waitMs = Math.max(800, Math.min(5_000, Math.ceil(estimated * 1_000)));
    return { retry: true, waitMs };
  }
  return { retry: false, waitMs: 0 };
}

function extractJsonText(payload: unknown): string | null {
  if (typeof payload === "string") return payload;
  if (!payload) return null;
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0] as any;
    if (typeof first?.generated_text === "string") return first.generated_text;
    if (typeof first?.summary_text === "string") return first.summary_text;
    if (typeof first?.text === "string") return first.text;
  }
  if (typeof payload === "object") {
    const obj = payload as Record<string, any>;
    if (typeof obj.generated_text === "string") return obj.generated_text;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.url === "string") return obj.url;
  }
  return null;
}

function jsonWithTaskHints(task: AITask, payload: unknown): Record<string, unknown> {
  const text = extractJsonText(payload);
  const obj = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  if (typeof obj.url === "string") {
    return { ...obj, resultType: "url", task };
  }
  if (text) {
    return { ...obj, text, resultType: "text", task };
  }
  return { ...obj, resultType: "json", task };
}

async function executeHuggingFaceModel(task: AITask, input: Record<string, unknown>, timeoutMs: number, model: string, key: string): Promise<TaskExecutionResult> {
  const startedAt = Date.now();
  const endpoint = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
  const payload = buildTaskPayload(task, input);

  let attempt = 0;
  while (attempt < 3) {
    const response = await abortableFetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
          "x-wait-for-model": "true",
        },
        body: JSON.stringify(payload),
      },
      timeoutMs,
    );
    await throwForHttpError(response, "Hugging Face", endpoint);

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("application/json") || contentType.includes("text/")) {
      const jsonPayload = await response.json();
      const modelLoading = shouldRetryForModelLoading(jsonPayload);
      if (modelLoading.retry && attempt < 2) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, modelLoading.waitMs));
        continue;
      }
      return {
        provider: "huggingface",
        task,
        model,
        output: jsonWithTaskHints(task, jsonPayload),
        latencyMs: Date.now() - startedAt,
        resultType: "json",
        routeReason: `HF task model ${model} selected for ${task}`,
        endpointFamily: "hf_inference",
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const mimeType = contentType.split(";")[0] || "application/octet-stream";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return {
      provider: "huggingface",
      task,
      model,
      output: {
        resultType: "base64",
        mimeType,
        base64,
        task,
      },
      latencyMs: Date.now() - startedAt,
      resultType: "base64",
      routeReason: `HF task model ${model} returned ${mimeType || "binary"} output`,
      endpointFamily: "hf_inference",
    };
  }

  throw new Error(`Hugging Face model loading retries exhausted for ${model}`);
}

export async function executeHuggingFaceTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const key = await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY");
  if (!key) {
    throw new Error("Hugging Face provider is not configured");
  }
  const requestedModel = typeof input.model === "string" ? input.model.trim() : "";
  const models = requestedModel ? [requestedModel] : await resolveHuggingFaceTaskModels(task);
  if (!models.length) {
    throw new Error(`Hugging Face ${task} model is not configured`);
  }

  const errors: string[] = [];
  try {
    for (const model of models) {
      try {
        return await executeHuggingFaceModel(task, input, timeoutMs, model, key);
      } catch (error) {
        errors.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error(`All Hugging Face ${task} candidates failed: ${errors.join(" | ")}`);
  } catch (error) {
    const model = models[0] ?? task;
    const endpoint = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
    throw toProviderHttpError(error, endpoint, "Hugging Face");
  }
}

export async function checkHuggingFaceNetwork(): Promise<{ ok: true; address?: string } | { ok: false; error: string }> {
  try {
    const result = await dns.lookup(HUGGINGFACE_INFERENCE_HOST);
    return { ok: true, address: result.address };
  } catch (error) {
    return {
      ok: false,
      error: `Hugging Face DNS/network unavailable for ${HUGGINGFACE_INFERENCE_HOST}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function testHuggingFaceProvider(timeoutMs = 18_000) {
  const textModel = await resolveHuggingFaceTaskModel("copywriting");
  if (!textModel) {
    return {
      provider: "huggingface" as const,
      status: "skipped" as const,
      reason: "HF_TASK_COPYWRITING_MODEL is not configured",
    };
  }
  const text = await executeHuggingFaceTask("copywriting", {
    prompt: "Reply with one sentence confirming text generation is operational.",
    max_new_tokens: 48,
  }, timeoutMs);
  const textPreview = typeof text.output === "object"
    ? String((text.output as any).text ?? (text.output as any).generated_text ?? "")
    : "";

  const imageModel = await resolveHuggingFaceTaskModel("text_to_image");
  const imageTest = imageModel
    ? await executeHuggingFaceTask("text_to_image", { prompt: "Minimal plain white square icon." }, timeoutMs)
    : null;
  return {
    provider: "huggingface" as const,
    status: "success" as const,
    model: textModel,
    textPreview: textPreview.slice(0, 200),
    image: imageTest
      ? { status: "tested" as const, model: imageModel, resultType: (imageTest.output as any)?.resultType ?? "unknown" }
      : { status: "skipped" as const, reason: "No HF_TASK_TEXT_TO_IMAGE_MODEL configured" },
  };
}

async function testOptionalHuggingFaceTask(task: AITask, modelKey: string, envKey: string, prompt: string, timeoutMs: number) {
  const resolution = await resolveHuggingFaceTaskModelResolution(task);
  const model = resolution.models[0] ?? "";
  if (!model) {
    return { status: "skipped" as const, reason: `No ${envKey} configured` };
  }
  try {
    const result = await executeHuggingFaceTask(task, { prompt }, timeoutMs);
    return {
      status: "tested" as const,
      model,
      modelSource: resolution.source,
      resultType: (result.output as any)?.resultType ?? "unknown",
      latencyMs: result.latencyMs,
    };
  } catch (error) {
    return {
      status: "failed" as const,
      model,
      modelSource: resolution.source,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function testHuggingFaceMediaProviders(timeoutMs = 18_000) {
  return {
    provider: "huggingface" as const,
    status: "completed" as const,
    image: await testOptionalHuggingFaceTask("text_to_image", "hf_task_text_to_image_model", "HF_TASK_TEXT_TO_IMAGE_MODEL", "Minimal plain white square icon.", timeoutMs),
    video: await testOptionalHuggingFaceTask("text_to_video", "hf_task_text_to_video_model", "HF_TASK_TEXT_TO_VIDEO_MODEL", "Two second simple stable doorway video.", timeoutMs),
    avatar: await testOptionalHuggingFaceTask("avatar_video", "hf_task_avatar_video_model", "HF_TASK_AVATAR_VIDEO_MODEL", "A calm presenter says EquiProfile helps stable owners stay organised.", timeoutMs),
  };
}

async function probeHead(url: string, timeoutMs = 6_000) {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "HEAD", signal: controller.signal });
    return {
      ok: response.ok,
      statusCode: response.status,
      latencyMs: Date.now() - started,
      error: null as string | null,
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHuggingFaceRoutingDiagnostics() {
  const key = await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY");
  const dnsResult = await dns.lookup("api-inference.huggingface.co")
    .then((result) => ({ ok: true, address: result.address, family: result.family, error: null as string | null }))
    .catch((error) => ({ ok: false, address: null, family: null as number | null, error: error instanceof Error ? error.message : String(error) }));
  const [webProbe, inferenceProbe, taskRouting] = await Promise.all([
    probeHead("https://huggingface.co"),
    probeHead("https://api-inference.huggingface.co"),
    Promise.all(HF_PIPELINE_TASKS.map((task) => resolveHuggingFacePipelineRouting(task))),
  ]);
  return {
    provider: "huggingface" as const,
    keyPresent: Boolean(key),
    network: {
      dns: dnsResult,
      huggingfaceDotCo: webProbe,
      inferenceEndpoint: inferenceProbe,
    },
    taskRouting,
  };
}
