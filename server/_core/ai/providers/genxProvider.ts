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

const DEFAULT_MODEL = "genx-core-reasoner";
const DEFAULT_BASE_URL = "https://api.genx.ai";

export async function resolveGenXConfig() {
  const key = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");
  const model = (await getRuntimeConfig("genx_model", "GENX_MODEL")) || DEFAULT_MODEL;
  const baseRaw = (await getRuntimeConfig("genx_base_url", "GENX_BASE_URL")) || DEFAULT_BASE_URL;
  const base = normalizeBaseUrl(baseRaw, "/v1");
  const endpoint = buildEndpoint(base, "/chat/completions");
  return { key, model, base, endpoint };
}

export async function executeGenXTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const { key, model, endpoint } = await resolveGenXConfig();
  if (!key) {
    throw new Error("GenX provider is not configured");
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
          max_tokens: typeof input.max_tokens === "number" ? input.max_tokens : undefined,
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
    };
  } catch (error) {
    throw toProviderHttpError(error, endpoint, "GenX");
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
