import { getRuntimeConfig } from "../../../dynamicConfig";
import { executeGenXTask } from "./genxProvider";
import { executeHuggingFaceTask } from "./huggingFaceProvider";
import { executeQwenTask, resolveQwenConfig, testQwenTextGeneration } from "./qwenProvider";
import { aiUsageAnalytics } from "../analytics/usageAnalytics";
import type { AIProviderName, AITask, TaskExecutionResult } from "../types";
import { resolveGenXConfig, testGenXTextGeneration } from "./genxProvider";
import { resolveHuggingFaceTaskModel, testHuggingFaceProvider } from "./huggingFaceProvider";

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
}> = {
  genx: {},
  huggingface: {},
  qwen: {},
};

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
  if (provider === "qwen") {
    return task === "chat" || task === "copywriting";
  }
  if (provider === "huggingface" && (task === "copywriting" || task === "chat")) {
    const model = await resolveHuggingFaceTaskModel(task);
    return !!model;
  }
  return true;
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

  return [
    {
      provider: "genx",
      configured: genxConfigured,
      status: genxConfigured ? "healthy" : "offline",
      message: genxConfigured ? "GenX configured" : "Missing GENX_API_KEY / genx_api_key",
      endpoint: genxEndpoint,
      model: genxModel,
      ...providerRuntime.genx,
    },
    {
      provider: "huggingface",
      configured: hfConfigured,
      status: hfConfigured && hfModel ? "healthy" : hfConfigured ? "degraded" : "degraded",
      message: !hfConfigured
        ? "Missing HUGGINGFACE_API_KEY / huggingface_api_key"
        : hfModel
          ? "Hugging Face configured"
          : "Hugging Face key set, but HF_TASK_COPYWRITING_MODEL is missing",
      endpoint: "https://api-inference.huggingface.co/models/{model}",
      model: hfModel,
      ...providerRuntime.huggingface,
    },
    {
      provider: "qwen",
      configured: qwenConfigured,
      status: qwenConfigured ? "healthy" : "degraded",
      message: qwenConfigured
        ? "Qwen configured (optional)"
        : "Optional provider; set QWEN_API_KEY / qwen_api_key to enable",
      endpoint: qwenEndpoint,
      model: qwenModel,
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
      checks.push(await testGenXTextGeneration());
    }
  } catch (error) {
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
      checks.push(await testHuggingFaceProvider());
    }
  } catch (error) {
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
      checks.push(await testQwenTextGeneration());
    }
  } catch (error) {
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
