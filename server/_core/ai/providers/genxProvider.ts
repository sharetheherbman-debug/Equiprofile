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
const DEFAULT_MODEL = "gpt-5.4-turbo";

export async function resolveGenXConfig() {
  const key = await getRuntimeConfig("genx_api_key", "GENX_API_KEY");
  const model = (await getRuntimeConfig("genx_model", "GENX_MODEL")) || DEFAULT_MODEL;
  const baseRaw = (await getRuntimeConfig("genx_base_url", "GENX_BASE_URL")) || DEFAULT_GENX_BASE_URL;
  const base = normalizeBaseUrl(baseRaw, "/v1");
  const endpoint = base ? buildEndpoint(base, "/chat/completions") : "";
  return { key, model, baseRaw, base, endpoint };
}

export async function executeGenXTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const { key, model, endpoint } = await resolveGenXConfig();
  if (!key) {
    throw new Error("GenX provider is not configured");
  }
  if (!endpoint) {
    throw new Error("GenX base URL not reachable. Use Advanced provider repair if the default GenX route is unavailable.");
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
      responseSummary: "GenX base URL not reachable. Use Advanced provider repair if the default GenX route is unavailable.",
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
