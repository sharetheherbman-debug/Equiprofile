import { getRuntimeConfig } from "../../../dynamicConfig";
import { executeGenXTask, testGenXTextGeneration, testRawGenXConnection } from "./genxProvider";
import { executeHuggingFaceTask } from "./huggingFaceProvider";
import { executeQwenTask, resolveQwenConfig, testQwenTextGeneration } from "./qwenProvider";
import { aiUsageAnalytics } from "../analytics/usageAnalytics";
import type { AIProviderName, AITask, TaskExecutionResult } from "../types";
import { resolveGenXConfig } from "./genxProvider";
import { resolveHuggingFaceTaskModel, testHuggingFaceMediaProviders, testHuggingFaceProvider } from "./huggingFaceProvider";

type ProviderHealth = {
  provider: AIProviderName;
  configured: boolean;
  status: "healthy" | "degraded" | "offline";
  message: string;
  endpoint?: string;
  model?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  lastLatencyMs?: number;
  lastTestAt?: string;
  lastTestStatus?: "success" | "failed" | "skipped" | "missing_key" | "missing_base_url";
  lastStatusCode?: number | null;
  liveReady: boolean;
};

const executors: Record<AIProviderName, (task: AITask, input: Record<string, unknown>, timeoutMs: number) => Promise<TaskExecutionResult>> = {
  genx: executeGenXTask,
  huggingface: executeHuggingFaceTask,
  qwen: executeQwenTask,
};

const providerRuntime: Record<AIProviderName, {
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  lastLatencyMs?: number;
  lastTestAt?: string;
  lastTestStatus?: "success" | "failed" | "skipped" | "missing_key" | "missing_base_url";
  lastStatusCode?: number | null;
  lastResponseSummary?: string;
  lastMediaSuccessAt?: string;
}> = {
  genx: {},
  huggingface: {},
  qwen: {},
};

const LIVE_TEST_TTL_MS = 15 * 60 * 1000;

function hasRecentLiveSuccess(provider: AIProviderName, kind: "text" | "media" = "text"): boolean {
  const stamp = kind === "media"
    ? providerRuntime[provider].lastMediaSuccessAt
    : providerRuntime[provider].lastSuccessAt;
  if (!stamp) return false;
  return Date.now() - new Date(stamp).getTime() <= LIVE_TEST_TTL_MS;
}

export function resetProviderRuntimeForTests() {
  providerRuntime.genx = {};
  providerRuntime.huggingface = {};
  providerRuntime.qwen = {};
}

function recordProviderTest(provider: AIProviderName, result: Record<string, any>) {
  const now = new Date().toISOString();
  const success = result.status === "success";
  const mediaOnly = result.mediaOnly === true;
  providerRuntime[provider] = {
    ...providerRuntime[provider],
    lastTestAt: now,
    lastTestStatus: result.status ?? (success ? "success" : "failed"),
    lastStatusCode: typeof result.statusCode === "number" ? result.statusCode : null,
    lastResponseSummary:
      typeof result.responseSummary === "string"
        ? result.responseSummary
        : typeof result.reason === "string"
          ? result.reason
          : typeof result.error === "string"
            ? result.error
            : undefined,
    ...(success && !mediaOnly
      ? { lastSuccessAt: now, lastLatencyMs: Number(result.latencyMs ?? 0), lastError: undefined, lastErrorAt: undefined }
      : !success
        ? {
          lastSuccessAt: undefined,
          lastLatencyMs: undefined,
          lastErrorAt: now,
          lastError: String(result.responseSummary ?? result.reason ?? result.error ?? "Provider test failed"),
        }
        : {}),
  };

  const image = result.image as Record<string, unknown> | undefined;
  const mediaResultType = typeof image?.resultType === "string" ? image.resultType : "";
  if (
    success &&
    image?.status === "tested" &&
    ["url", "base64", "file"].includes(mediaResultType)
  ) {
    providerRuntime[provider].lastMediaSuccessAt = now;
  }
}

export class ProviderSelectionError extends Error {
  readonly code: "provider_missing" | "provider_unavailable";

  constructor(code: "provider_missing" | "provider_unavailable", message: string) {
    super(message);
    this.name = "ProviderSelectionError";
    this.code = code;
  }
}

export async function isConfigured(provider: AIProviderName): Promise<boolean> {
  if (provider === "genx") {
    return !!(await getRuntimeConfig("genx_api_key", "GENX_API_KEY"));
  }
  if (provider === "huggingface") {
    return !!(await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY"));
  }
  return !!(await getRuntimeConfig("qwen_api_key", "QWEN_API_KEY"));
}

export async function isProviderAvailableForTask(provider: AIProviderName, task: AITask): Promise<boolean> {
  if (!(await isConfigured(provider))) return false;
  if (provider === "genx" && !(await resolveGenXConfig()).endpoint) return false;
  if (provider === "qwen") {
    if (task !== "chat" && task !== "copywriting") return false;
    return hasRecentLiveSuccess("qwen") || (await runProviderLiveTextTest("qwen"));
  }
  if (provider === "huggingface" && (task === "copywriting" || task === "chat")) {
    const model = await resolveHuggingFaceTaskModel(task);
    if (!model) return false;
    return hasRecentLiveSuccess("huggingface") || (await runProviderLiveTextTest("huggingface"));
  }
  if (provider === "genx" && (task === "copywriting" || task === "chat")) {
    return hasRecentLiveSuccess("genx") || (await runProviderLiveTextTest("genx"));
  }
  return true;
}

async function runProviderLiveTextTest(provider: AIProviderName): Promise<boolean> {
  try {
    if (provider === "genx") {
      const result = await testGenXTextGeneration();
      recordProviderTest("genx", result);
      return result.status === "success";
    }
    if (provider === "qwen") {
      const result = await testQwenTextGeneration();
      recordProviderTest("qwen", result);
      return result.status === "success";
    }
    const result = await testHuggingFaceProvider();
    recordProviderTest("huggingface", result);
    return result.status === "success";
  } catch (error) {
    recordProviderTest(provider, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function getProviderEndpoint(provider: AIProviderName): Promise<string | undefined> {
  if (provider === "genx") return (await resolveGenXConfig()).endpoint;
  if (provider === "qwen") return (await resolveQwenConfig()).endpoint;
  return "https://api-inference.huggingface.co/models/{model}";
}

async function getProviderModel(provider: AIProviderName): Promise<string | undefined> {
  if (provider === "genx") return (await resolveGenXConfig()).model;
  if (provider === "qwen") return (await resolveQwenConfig()).model;
  return resolveHuggingFaceTaskModel("copywriting");
}

export function getProviderRuntimeDiagnostics() {
  return { ...providerRuntime };
}

export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const [genxConfigured, hfConfigured, qwenConfigured, genxEndpoint, hfModel, qwenEndpoint, genxModel, qwenModel] = await Promise.all([
    isConfigured("genx"),
    isConfigured("huggingface"),
    isConfigured("qwen"),
    getProviderEndpoint("genx"),
    getProviderModel("huggingface"),
    getProviderEndpoint("qwen"),
    getProviderModel("genx"),
    getProviderModel("qwen"),
  ]);

  const genxLiveReady = hasRecentLiveSuccess("genx");
  const hfLiveReady = hasRecentLiveSuccess("huggingface");
  const qwenLiveReady = hasRecentLiveSuccess("qwen");

  return [
    {
      provider: "genx",
      configured: genxConfigured,
      status: genxLiveReady ? "healthy" : genxConfigured ? "degraded" : "offline",
      message: genxLiveReady
        ? "GenX live test passed recently"
        : !genxConfigured
          ? "Missing GENX_API_KEY / genx_api_key"
          : !genxEndpoint
            ? "GenX base URL not reachable. Use Advanced provider repair if the default GenX route is unavailable."
            : "GenX key is present, but a live text-generation test has not passed.",
      endpoint: genxEndpoint,
      model: genxModel,
      liveReady: genxLiveReady,
      ...providerRuntime.genx,
    },
    {
      provider: "huggingface",
      configured: hfConfigured,
      status: hfLiveReady ? "healthy" : hfConfigured ? "degraded" : "offline",
      message: hfLiveReady
        ? "Hugging Face live test passed recently"
        : !hfConfigured
        ? "Missing HUGGINGFACE_API_KEY / huggingface_api_key"
        : hfModel
          ? "Hugging Face key/model present, but a live generation test has not passed."
          : "Hugging Face key set, but HF_TASK_COPYWRITING_MODEL is missing",
      endpoint: "https://api-inference.huggingface.co/models/{model}",
      model: hfModel,
      liveReady: hfLiveReady,
      ...providerRuntime.huggingface,
    },
    {
      provider: "qwen",
      configured: qwenConfigured,
      status: qwenLiveReady ? "healthy" : qwenConfigured ? "degraded" : "offline",
      message: qwenLiveReady
        ? "Qwen live test passed recently"
        : qwenConfigured
        ? "Qwen key is present, but a live test has not passed."
        : "Optional provider; set QWEN_API_KEY / qwen_api_key to enable",
      endpoint: qwenEndpoint,
      model: qwenModel,
      liveReady: qwenLiveReady,
      ...providerRuntime.qwen,
    },
  ];
}

export async function executeWithProvider(provider: AIProviderName, task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  try {
    const result = await executors[provider](task, input, timeoutMs);
    aiUsageAnalytics.recordUsage({
      at: new Date().toISOString(),
      provider,
      task,
      latencyMs: result.latencyMs,
      promptTokens: result.usage?.promptTokens ?? 0,
      completionTokens: result.usage?.completionTokens ?? 0,
    });
    providerRuntime[provider] = {
      ...providerRuntime[provider],
      lastSuccessAt: new Date().toISOString(),
      lastLatencyMs: result.latencyMs,
    };
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    providerRuntime[provider] = {
      ...providerRuntime[provider],
      lastErrorAt: new Date().toISOString(),
      lastError: message,
    };
    throw error;
  }
}

export async function executeWithFallback(
  providers: AIProviderName[],
  task: AITask,
  input: Record<string, unknown>,
  timeoutMs: number,
  maxRetries = 1,
): Promise<TaskExecutionResult> {
  const availableProviders: AIProviderName[] = [];
  for (const provider of providers) {
    if (await isProviderAvailableForTask(provider, task)) {
      availableProviders.push(provider);
      continue;
    }
    aiUsageAnalytics.recordFailure({
      at: new Date().toISOString(),
      provider,
      task,
      error: "skipped: provider unavailable or not configured for task",
    });
  }

  if (availableProviders.length === 0) {
    throw new ProviderSelectionError(
      "provider_missing",
      `No configured provider is available for task "${task}"`,
    );
  }

  let lastError: Error | null = null;

  for (const provider of availableProviders) {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        return await executeWithProvider(provider, task, input, timeoutMs);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        aiUsageAnalytics.recordFailure({
          at: new Date().toISOString(),
          provider,
          task,
          error: `attempt ${attempt + 1}: ${message}`,
        });
        lastError = error instanceof Error ? error : new Error(message);
      }
    }
  }

  if (lastError) {
    throw new ProviderSelectionError("provider_unavailable", "All configured providers failed for this task");
  }
  throw new ProviderSelectionError("provider_unavailable", "AI provider execution failed");
}

export async function runFullProviderSelfTest() {
  const checks: Array<Record<string, unknown>> = [];
  const storage: Record<string, unknown> = {};

  try {
    const configured = await isConfigured("genx");
    if (!configured) {
      checks.push({ provider: "genx", status: "skipped", reason: "Not configured" });
    } else {
      const rawResult = await testRawGenXConnection();
      checks.push({ ...rawResult, test: "raw_connectivity" });
      const textResult = await testGenXTextGeneration();
      recordProviderTest("genx", textResult);
      checks.push({ ...textResult, test: "chat_copy_generation" });
    }
  } catch (error) {
    recordProviderTest("genx", {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    checks.push({
      provider: "genx",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const configured = await isConfigured("huggingface");
    if (!configured) {
      checks.push({ provider: "huggingface", status: "skipped", reason: "Not configured" });
    } else {
      const result = await testHuggingFaceProvider();
      recordProviderTest("huggingface", result);
      checks.push(result);
      const mediaResult = await testHuggingFaceMediaProviders();
      const mediaChecks = [mediaResult.image, mediaResult.video, mediaResult.avatar];
      const playableMedia = mediaChecks.find((check: any) =>
        check?.status === "tested" && ["url", "base64", "file"].includes(String(check.resultType ?? "")),
      );
      if (playableMedia) {
        recordProviderTest("huggingface", { status: "success", mediaOnly: true, image: playableMedia });
      }
      checks.push(mediaResult);
    }
  } catch (error) {
    recordProviderTest("huggingface", {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    checks.push({
      provider: "huggingface",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const configured = await isConfigured("qwen");
    if (!configured) {
      checks.push({ provider: "qwen", status: "skipped", reason: "Optional provider not configured" });
    } else {
      const result = await testQwenTextGeneration();
      recordProviderTest("qwen", result);
      checks.push(result);
    }
  } catch (error) {
    recordProviderTest("qwen", {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
    checks.push({
      provider: "qwen",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const { ensureStorageDirs, writeTempFile, deleteAssetFile, STORAGE_ROOT } = await import("../../storage/localMediaStorage");
    await ensureStorageDirs();
    const temp = await writeTempFile(Buffer.from("diagnostics"), "txt", "diag");
    await deleteAssetFile(temp);
    storage.status = "success";
    storage.root = STORAGE_ROOT;
  } catch (error) {
    storage.status = "failed";
    storage.error = error instanceof Error ? error.message : String(error);
  }

  return {
    ranAt: new Date().toISOString(),
    checks,
    storage,
  };
}
