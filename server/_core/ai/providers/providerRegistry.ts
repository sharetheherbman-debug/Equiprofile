import { getRuntimeConfig } from "../../../dynamicConfig";
import { executeGenXTask } from "./genxProvider";
import { executeHuggingFaceTask } from "./huggingFaceProvider";
import { aiUsageAnalytics } from "../analytics/usageAnalytics";
import type { AIProviderName, AITask, TaskExecutionResult } from "../types";

type ProviderHealth = {
  provider: AIProviderName;
  configured: boolean;
  status: "healthy" | "degraded" | "offline";
  message: string;
};

const executors: Record<AIProviderName, (task: AITask, input: Record<string, unknown>, timeoutMs: number) => Promise<TaskExecutionResult>> = {
  genx: executeGenXTask,
  huggingface: executeHuggingFaceTask,
};

async function isConfigured(provider: AIProviderName): Promise<boolean> {
  if (provider === "genx") {
    return !!(await getRuntimeConfig("genx_api_key", "GENX_API_KEY"));
  }
  return !!(await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY"));
}

export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const [genxConfigured, hfConfigured] = await Promise.all([
    isConfigured("genx"),
    isConfigured("huggingface"),
  ]);

  return [
    {
      provider: "genx",
      configured: genxConfigured,
      status: genxConfigured ? "healthy" : "offline",
      message: genxConfigured ? "GenX configured" : "Missing GENX_API_KEY / genx_api_key",
    },
    {
      provider: "huggingface",
      configured: hfConfigured,
      status: hfConfigured ? "healthy" : "degraded",
      message: hfConfigured ? "Hugging Face configured" : "Missing HUGGINGFACE_API_KEY / huggingface_api_key",
    },
  ];
}

export async function executeWithProvider(provider: AIProviderName, task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const result = await executors[provider](task, input, timeoutMs);
  aiUsageAnalytics.recordUsage({
    at: new Date().toISOString(),
    provider,
    task,
    latencyMs: result.latencyMs,
    promptTokens: result.usage?.promptTokens ?? 0,
    completionTokens: result.usage?.completionTokens ?? 0,
  });
  return result;
}

export async function executeWithFallback(
  providers: AIProviderName[],
  task: AITask,
  input: Record<string, unknown>,
  timeoutMs: number,
  maxRetries = 1,
): Promise<TaskExecutionResult> {
  let lastError: Error | null = null;

  for (const provider of providers) {
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

  throw lastError ?? new Error("AI provider execution failed");
}
