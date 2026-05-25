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

const DEFAULT_QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode";
const DEFAULT_QWEN_MODEL = "qwen-plus";

export async function resolveQwenConfig() {
  const key = await getRuntimeConfig("qwen_api_key", "QWEN_API_KEY");
  const model = (await getRuntimeConfig("qwen_model", "QWEN_MODEL")) || DEFAULT_QWEN_MODEL;
  const baseRaw = (await getRuntimeConfig("qwen_base_url", "QWEN_BASE_URL")) || DEFAULT_QWEN_BASE_URL;
  const base = normalizeBaseUrl(baseRaw, "/v1");
  const endpoint = buildEndpoint(base, "/chat/completions");
  return { key, model, base, endpoint };
}

export async function executeQwenTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const { key, model, endpoint } = await resolveQwenConfig();
  if (!key) {
    throw new Error("Qwen provider is not configured");
  }

  const supportedTasks = new Set<AITask>(["chat", "copywriting"]);
  if (!supportedTasks.has(task)) {
    throw new Error(`Qwen does not currently support task "${task}" in this runtime`);
  }

  const startedAt = Date.now();
  const messages = (Array.isArray(input.messages) && input.messages.length > 0)
    ? input.messages
    : [{ role: "user", content: String(input.prompt ?? "") }];

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
          messages,
          temperature: typeof input.temperature === "number" ? input.temperature : 0.4,
          max_tokens: typeof input.max_tokens === "number" ? input.max_tokens : 512,
        }),
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
