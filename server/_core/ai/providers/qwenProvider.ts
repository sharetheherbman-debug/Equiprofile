import { getRuntimeConfig } from "../../../dynamicConfig";
import type { AITask, TaskExecutionResult } from "../types";
import { executeDashscopeMediaTask } from "../dashscopeMediaExecutor";
import {
  abortableFetch,
  buildEndpoint,
  normalizeBaseUrl,
  parseUsageFromOpenAI,
  throwForHttpError,
  toProviderHttpError,
} from "./httpUtils";

const DEFAULT_QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode";
const DEFAULT_QWEN_MODEL = "qwen-plus";

const QWEN_TASK_MODEL_KEYS: Partial<Record<AITask, { setting: string; env: string }>> = {
  chat: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  copywriting: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  strategy: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  campaign_generation: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  social_generation: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  email_generation: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  classification: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  moderation: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
  image_captioning: { setting: "qwen_vision_model", env: "QWEN_VISION_MODEL" },
  text_to_image: { setting: "dashscope_image_model", env: "DASHSCOPE_IMAGE_MODEL" },
  image_edit: { setting: "dashscope_image_model", env: "DASHSCOPE_IMAGE_MODEL" },
  text_to_video: { setting: "dashscope_wan_text_to_video_model", env: "DASHSCOPE_WAN_TEXT_TO_VIDEO_MODEL" },
  image_to_video: { setting: "dashscope_wan_image_to_video_model", env: "DASHSCOPE_WAN_IMAGE_TO_VIDEO_MODEL" },
  avatar_video: { setting: "dashscope_wan_text_to_video_model", env: "DASHSCOPE_WAN_TEXT_TO_VIDEO_MODEL" },
  text_to_speech: { setting: "dashscope_audio_model", env: "DASHSCOPE_AUDIO_MODEL" },
  speech_to_text: { setting: "dashscope_audio_model", env: "DASHSCOPE_AUDIO_MODEL" },
  embeddings: { setting: "qwen_embedding_model", env: "QWEN_EMBEDDING_MODEL" },
  analytics: { setting: "qwen_text_model", env: "QWEN_TEXT_MODEL" },
};

const QWEN_OPENAI_CHAT_TASKS = new Set<AITask>([
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

export function isQwenTaskExecutableViaCurrentRuntime(task: AITask): boolean {
  return QWEN_OPENAI_CHAT_TASKS.has(task) || task === "embeddings";
}

export function qwenUnsupportedTaskReason(task: AITask): string {
  if (isQwenTaskExecutableViaCurrentRuntime(task)) return "";
  return `Qwen ${task} requires DashScope-native media execution; status is setup_needed until native endpoint implementation is enabled.`;
}

export async function resolveQwenConfig(task?: AITask) {
  const key = await getRuntimeConfig("qwen_api_key", "QWEN_API_KEY");
  const taskKeys = task ? QWEN_TASK_MODEL_KEYS[task] : undefined;
  const taskModel = taskKeys ? await getRuntimeConfig(taskKeys.setting, taskKeys.env) : "";
  const legacyTaskModel = task === "text_to_image" || task === "image_edit"
    ? await getRuntimeConfig("qwen_image_model", "QWEN_IMAGE_MODEL")
    : task === "text_to_video" || task === "avatar_video" || task === "image_to_video"
      ? await getRuntimeConfig("qwen_video_model", "QWEN_VIDEO_MODEL")
      : task === "text_to_speech" || task === "speech_to_text"
        ? await getRuntimeConfig("qwen_audio_model", "QWEN_AUDIO_MODEL")
        : "";
  const model = taskModel || legacyTaskModel || (await getRuntimeConfig("qwen_model", "QWEN_MODEL")) || DEFAULT_QWEN_MODEL;
  const baseRaw = (await getRuntimeConfig("qwen_base_url", "QWEN_BASE_URL")) || DEFAULT_QWEN_BASE_URL;
  const base = normalizeBaseUrl(baseRaw, "/v1");
  const endpoint = buildEndpoint(base, task === "embeddings" ? "/embeddings" : "/chat/completions");
  return { key, model, base, endpoint };
}

export async function executeQwenTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const { key, model: configuredModel, endpoint } = await resolveQwenConfig(task);
  const model = typeof input.model === "string" && input.model.trim() ? input.model.trim() : configuredModel;
  if (!key) {
    throw new Error("Qwen provider is not configured");
  }

  if (!isQwenTaskExecutableViaCurrentRuntime(task)) {
    const mediaResult = await executeDashscopeMediaTask(task);
    if (mediaResult.status === "setup_needed") {
      throw new Error(mediaResult.message);
    }
    throw new Error(qwenUnsupportedTaskReason(task));
  }

  const startedAt = Date.now();
  const messages = (Array.isArray(input.messages) && input.messages.length > 0)
    ? input.messages
    : [{ role: "user", content: String(input.prompt ?? "") }];

  try {
    const body = task === "embeddings"
      ? {
        model,
        input: input.input ?? input.prompt ?? input.text ?? "",
      }
      : {
        model,
        messages,
        temperature: typeof input.temperature === "number" ? input.temperature : 0.4,
        max_tokens: typeof input.max_tokens === "number" ? input.max_tokens : 512,
      };
    const response = await abortableFetch(
      endpoint,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
    await throwForHttpError(response, "Qwen", endpoint);
    const payload = await response.json();
    return {
      provider: "qwen",
      task,
      model,
      output: payload,
      usage: parseUsageFromOpenAI(payload),
      latencyMs: Date.now() - startedAt,
      resultType: "json",
      routeReason: `Qwen OpenAI-compatible endpoint selected model ${model} for ${task}`,
      endpointFamily: task === "embeddings" ? "dashscope_openai_embeddings" : "dashscope_openai_chat",
    };
  } catch (error) {
    throw toProviderHttpError(error, endpoint, "Qwen");
  }
}

export async function testQwenTextGeneration(timeoutMs = 12_000) {
  const startedAt = Date.now();
  const { model, endpoint } = await resolveQwenConfig();
  const result = await executeQwenTask(
    "copywriting",
    { prompt: "Return one short sentence confirming Qwen text generation is operational." },
    timeoutMs,
  );
  return {
    provider: "qwen" as const,
    status: "success" as const,
    model,
    endpoint,
    latencyMs: Date.now() - startedAt,
    preview: typeof result.output === "object"
      ? ((result.output as any)?.choices?.[0]?.message?.content ?? null)
      : null,
  };
}
