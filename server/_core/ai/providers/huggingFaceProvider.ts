import { getRuntimeConfig } from "../../../dynamicConfig";
import type { AITask, TaskExecutionResult } from "../types";
import {
  abortableFetch,
  throwForHttpError,
  toProviderHttpError,
} from "./httpUtils";

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
};

export async function resolveHuggingFaceTaskModel(task: AITask): Promise<string> {
  const modelKey = `hf_task_${task}_model`;
  const envModelKey = TASK_MODEL_ENV_KEYS[task] ?? `HF_TASK_${task.toUpperCase()}_MODEL`;
  const configuredModel = await getRuntimeConfig(modelKey, envModelKey);
  if (configuredModel) return configuredModel;
  if (task === "copywriting" || task === "chat") {
    return "";
  }
  return defaultModelByTask[task] || "";
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
      return { inputs: input.input ?? input.prompt ?? input.text ?? "" };
    case "chat":
    case "copywriting":
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

export async function executeHuggingFaceTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const key = await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY");
  if (!key) {
    throw new Error("Hugging Face provider is not configured");
  }
  const model = await resolveHuggingFaceTaskModel(task);
  if (!model) {
    throw new Error(`Hugging Face ${task} model is not configured`);
  }

  const startedAt = Date.now();
  const endpoint = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
  const payload = buildTaskPayload(task, input);

  try {
    let attempt = 0;
    while (attempt < 3) {
      const response = await abortableFetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${key}`,
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
      };
    }

    throw new Error("Hugging Face model loading retries exhausted");
  } catch (error) {
    throw toProviderHttpError(error, endpoint, "Hugging Face");
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

  const imageModel = await getRuntimeConfig("hf_task_text_to_image_model", "HF_TASK_TEXT_TO_IMAGE_MODEL");
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
