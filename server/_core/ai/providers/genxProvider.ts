import { getRuntimeConfig } from "../../../dynamicConfig";
import type { AITask, TaskExecutionResult } from "../types";

const DEFAULT_MODEL = "genx-core-reasoner";
const DEFAULT_BASE_URL = "https://api.genx.ai/v1";

const abortableFetch = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export async function executeGenXTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const key = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");
  if (!key) {
    throw new Error("GenX provider is not configured");
  }

  const model = (await getRuntimeConfig("genx_model", "GENX_MODEL")) || DEFAULT_MODEL;
  const base = ((await getRuntimeConfig("genx_base_url", "GENX_BASE_URL")) || DEFAULT_BASE_URL).replace(/\/$/, "");
  const startedAt = Date.now();

  const messages = (input.messages as unknown[]) || [{ role: "user", content: String(input.prompt ?? "") }];
  const response = await abortableFetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, task }),
  }, timeoutMs);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GenX execution failed: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as {
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  return {
    provider: "genx",
    task,
    model,
    output: payload,
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      totalTokens: payload.usage?.total_tokens ?? 0,
    },
    latencyMs: Date.now() - startedAt,
  };
}
