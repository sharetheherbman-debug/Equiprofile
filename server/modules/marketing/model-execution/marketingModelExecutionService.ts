import { executeAITaskWithProviderRoute } from "../../../_core/ai/orchestrator";
import { isProviderAvailableForTask } from "../../../_core/ai/providers/providerRegistry";
import { resolveModelCandidatesForTask } from "../../../_core/ai/modelRegistry";
import type { AIProviderName, AITask, AIExecutionResponse } from "../../../_core/ai";
import { buildMarketingFallbackOutput } from "./marketingModelExecutionFallback";
import { parseMarketingModelObject, parseMarketingModelOutput } from "./marketingModelExecutionParser";
import { buildMarketingModelPrompt } from "./marketingModelExecutionPrompts";
import type { MarketingExecutionMode, MarketingModelExecutionInput, MarketingModelExecutionOutput, MarketingModelTask } from "./marketingModelExecutionTypes";

const STANDARD_FIRST_TASKS = new Set<MarketingModelTask>([
  "platform_copywriting",
  "hook_generation",
  "cta_variants",
  "localization",
  "qa_summary",
  "blog_seo_generation",
  "email_generation",
  "angle_generation",
]);

const ELITE_GENX_TASKS = new Set<MarketingModelTask>([
  "campaign_strategy",
  "platform_copywriting",
  "scriptwriting",
  "scene_planning",
  "prompt_direction",
  "angle_generation",
]);

function estimatedCostTier(mode: MarketingExecutionMode, task: MarketingModelTask): "low" | "medium" | "high" {
  if (mode === "elite") return "high";
  if (["campaign_strategy", "scene_planning", "scriptwriting", "prompt_direction"].includes(task)) return "high";
  if (["hook_generation", "cta_variants", "localization", "qa_summary"].includes(task)) return "low";
  return "medium";
}

function aiTaskForMarketingTask(task: MarketingModelTask): AITask {
  if (task === "campaign_strategy" || task === "scene_planning" || task === "prompt_direction") return "strategy";
  if (task === "email_generation") return "email_generation";
  return "copywriting";
}

function preferredProviders(mode: MarketingExecutionMode, task: MarketingModelTask): AIProviderName[] {
  if (mode === "elite") {
    if (ELITE_GENX_TASKS.has(task)) return ["genx", "qwen", "huggingface"];
    return ["genx", "huggingface", "qwen"];
  }
  if (STANDARD_FIRST_TASKS.has(task)) return ["qwen", "huggingface", "genx"];
  return ["huggingface", "qwen", "genx"];
}

function routeReason(mode: MarketingExecutionMode, task: MarketingModelTask, provider: AIProviderName | null): string {
  if (!provider) return `No configured provider available for ${task}.`;
  if (mode === "elite") return `${provider} selected for elite ${task} quality route.`;
  return `${provider} selected for standard ${task} cost-aware route.`;
}

function fallbackModelFor(provider: AIProviderName, mode: MarketingExecutionMode): string {
  if (provider === "genx") return mode === "elite" ? "genx-premium-strategy" : "genx-balanced";
  if (provider === "huggingface") return "hf-qwen-instruct";
  return "qwen-plus-marketing";
}

function outputTextFromExecution(response: AIExecutionResponse): string | null {
  const output = response.output;
  if (typeof output === "string") return output;
  if (!output || typeof output !== "object") return null;
  const record = output as Record<string, unknown>;
  for (const key of ["text", "content", "result", "response", "output", "message", "answer"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key];
  }
  return null;
}

function outputObjectFromExecution(response: AIExecutionResponse): Record<string, unknown> | null {
  const output = response.output;
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  return output as Record<string, unknown>;
}

async function resolveRoute(input: MarketingModelExecutionInput): Promise<{
  provider: AIProviderName | null;
  model: string | null;
  selectedProvider: AIProviderName | null;
  selectedModel: string | null;
  providerStatus: "ready" | "provider_unavailable" | "setup_needed";
  routeReason: string;
}> {
  const aiTask = aiTaskForMarketingTask(input.task);
  const providers = preferredProviders(input.mode, input.task);
  const candidates = await resolveModelCandidatesForTask(aiTask);
  const registry = input.providerHealthRegistry;
  const forcedProvider = input.provider;
  const forcedModel = typeof input.model === "string" && input.model.trim() ? input.model.trim() : null;

  if (forcedProvider) {
    const providerCandidates = candidates.filter((candidate) => candidate.provider === forcedProvider);
    const registryRow = registry?.find((entry) => entry.provider === forcedProvider);
    const configured = registryRow ? registryRow.configured : providerCandidates.length > 0;
    if (!configured) {
      return {
        provider: null,
        model: null,
        selectedProvider: null,
        selectedModel: null,
        providerStatus: "setup_needed",
        routeReason: `Forced provider ${forcedProvider} is not configured for ${input.task}.`,
      };
    }
    const available = registryRow ? registryRow.available : await isProviderAvailableForTask(forcedProvider, aiTask);
    if (!available) {
      return {
        provider: null,
        model: null,
        selectedProvider: null,
        selectedModel: null,
        providerStatus: "provider_unavailable",
        routeReason: `Forced provider ${forcedProvider} is unavailable for ${input.task}.`,
      };
    }
    const selectedModel = forcedModel
      ?? providerCandidates[0]?.id
      ?? fallbackModelFor(forcedProvider, input.mode);
    return {
      provider: forcedProvider,
      model: selectedModel,
      selectedProvider: forcedProvider,
      selectedModel,
      providerStatus: "ready",
      routeReason: `Forced provider route ${forcedProvider} selected for ${input.task}.`,
    };
  }

  let configuredCount = 0;
  for (const provider of providers) {
    const providerCandidates = candidates.filter((candidate) => candidate.provider === provider);
    const registryRow = registry?.find((entry) => entry.provider === provider);
    const configured = registryRow ? registryRow.configured : providerCandidates.length > 0;
    if (!configured) continue;
    configuredCount += 1;
    const available = registryRow ? registryRow.available : await isProviderAvailableForTask(provider, aiTask);
    if (!available) continue;
    return {
      provider,
      model: providerCandidates[0]?.id ?? fallbackModelFor(provider, input.mode),
      selectedProvider: provider,
      selectedModel: providerCandidates[0]?.id ?? fallbackModelFor(provider, input.mode),
      providerStatus: "ready",
      routeReason: routeReason(input.mode, input.task, provider),
    };
  }

  return {
    provider: null,
    model: null,
    selectedProvider: null,
    selectedModel: null,
    providerStatus: configuredCount > 0 ? "provider_unavailable" : "setup_needed",
    routeReason: routeReason(input.mode, input.task, null),
  };
}

export async function executeMarketingModelTask(input: MarketingModelExecutionInput): Promise<MarketingModelExecutionOutput> {
  const generatedAt = new Date().toISOString();
  const fallbackOutput = buildMarketingFallbackOutput(input);
  const route = await resolveRoute(input);
  const selectedProvider = route.provider;
  const selectedModel = route.model;
  const base = {
    task: input.task,
    mode: input.mode,
    routeReason: route.routeReason,
    estimatedCostTier: estimatedCostTier(input.mode, input.task),
    generatedAt,
    reviewStatus: "needs_review" as const,
    selectedProvider,
    selectedModel,
  };

  if (!selectedProvider || !selectedModel) {
    const status = route.providerStatus === "setup_needed" ? "setup_needed" : "provider_unavailable";
    return {
      ...base,
      status,
      generationMode: "fallback",
      provider: null,
      model: null,
      executedProvider: null,
      executedModel: null,
      routeEnforced: false,
      routeMismatchReason: "No selected route available for execution.",
      fallbackReason: route.providerStatus === "setup_needed"
        ? "Provider setup required before model execution."
        : "Configured provider is currently unavailable.",
      output: fallbackOutput,
      rawText: null,
      warnings: ["Deterministic fallback used due to provider route availability."],
      parserWarnings: [],
      providerStatus: route.providerStatus,
    };
  }

  const aiTask = aiTaskForMarketingTask(input.task);
  const prompt = buildMarketingModelPrompt(input);

  try {
    const response = await executeAITaskWithProviderRoute({
      task: aiTask,
      requiresApproval: false,
      provider: selectedProvider,
      model: selectedModel,
      tenantScope: {
        tenantType: "stable",
        tenantId: input.tenantId,
      },
      input: {
        prompt: prompt.prompt,
      },
    });
    const executedProvider = response.provider ?? null;
    const executedModel = response.model ?? null;
    const providerMismatch = executedProvider !== selectedProvider;
    const modelMismatch = typeof selectedModel === "string"
      && typeof executedModel === "string"
      && selectedModel.trim().toLowerCase() !== executedModel.trim().toLowerCase();
    const routeMismatchReason = providerMismatch
      ? `Selected provider ${selectedProvider} but executed ${executedProvider ?? "none"}.`
      : modelMismatch
        ? `Selected model ${selectedModel} but executed ${executedModel ?? "none"}.`
        : null;
    const routeEnforced = routeMismatchReason === null;

    if (response.status !== "completed") {
      return {
        ...base,
        status: "fallback",
        generationMode: "fallback",
        provider: executedProvider ?? selectedProvider,
        model: executedModel ?? selectedModel,
        executedProvider,
        executedModel,
        routeEnforced,
        routeMismatchReason: routeMismatchReason ?? `Provider execution returned non-completed status: ${response.status}.`,
        fallbackReason: `Provider execution returned non-completed status: ${response.status}.`,
        output: fallbackOutput,
        rawText: outputTextFromExecution(response),
        warnings: ["Provider response was not completed; deterministic fallback used."],
        parserWarnings: [],
        providerStatus: "provider_unavailable",
      };
    }

    const objectOutput = outputObjectFromExecution(response);
    if (objectOutput) {
      const parsedObject = parseMarketingModelObject({ object: objectOutput, requiredFields: prompt.requiredFields });
      if (parsedObject.ok) {
        if (!routeEnforced) {
          return {
            ...base,
            status: "fallback",
            generationMode: "fallback",
            provider: executedProvider ?? selectedProvider,
            model: executedModel ?? selectedModel,
            executedProvider,
            executedModel,
            routeEnforced,
            routeMismatchReason,
            fallbackReason: routeMismatchReason,
            output: fallbackOutput,
            rawText: null,
            warnings: ["Route mismatch detected; deterministic fallback used."],
            parserWarnings: parsedObject.parserWarnings,
            providerStatus: "provider_unavailable",
          };
        }
        return {
          ...base,
          status: "completed",
          generationMode: "model",
          provider: executedProvider ?? selectedProvider,
          model: executedModel ?? selectedModel,
          executedProvider,
          executedModel,
          routeEnforced: true,
          routeMismatchReason: null,
          fallbackReason: null,
          output: parsedObject.output,
          rawText: null,
          warnings: [],
          parserWarnings: parsedObject.parserWarnings,
          providerStatus: "ready",
        };
      }
    }

    const rawText = outputTextFromExecution(response);
    if (!rawText?.trim()) {
      return {
        ...base,
        status: "fallback",
        generationMode: "fallback",
        provider: executedProvider ?? selectedProvider,
        model: executedModel ?? selectedModel,
        executedProvider,
        executedModel,
        routeEnforced,
        routeMismatchReason,
        fallbackReason: "Provider returned empty response.",
        output: fallbackOutput,
        rawText,
        warnings: ["Rejected empty provider response."],
        parserWarnings: ["Provider response contained no parsable text."],
        providerStatus: "provider_unavailable",
      };
    }

    const parsed = parseMarketingModelOutput({ rawText, requiredFields: prompt.requiredFields });
    if (parsed.ok) {
      if (!routeEnforced) {
        return {
          ...base,
          status: "fallback",
          generationMode: "fallback",
          provider: executedProvider ?? selectedProvider,
          model: executedModel ?? selectedModel,
          executedProvider,
          executedModel,
          routeEnforced,
          routeMismatchReason,
          fallbackReason: routeMismatchReason,
          output: fallbackOutput,
          rawText,
          warnings: ["Route mismatch detected; deterministic fallback used."],
          parserWarnings: parsed.parserWarnings,
          providerStatus: "provider_unavailable",
        };
      }
      return {
        ...base,
        status: "completed",
        generationMode: "model",
        provider: executedProvider ?? selectedProvider,
        model: executedModel ?? selectedModel,
        executedProvider,
        executedModel,
        routeEnforced: true,
        routeMismatchReason: null,
        fallbackReason: null,
        output: parsed.output,
        rawText,
        warnings: [],
        parserWarnings: parsed.parserWarnings,
        providerStatus: "ready",
      };
    }

    return {
      ...base,
      status: "fallback",
      generationMode: "fallback",
      provider: executedProvider ?? selectedProvider,
      model: executedModel ?? selectedModel,
      executedProvider,
      executedModel,
      routeEnforced,
      routeMismatchReason,
      fallbackReason: "Provider JSON was malformed or missing required fields.",
      output: fallbackOutput,
      rawText,
      warnings: ["Parser repair failed; deterministic fallback used."],
      parserWarnings: parsed.parserWarnings,
      providerStatus: "provider_unavailable",
    };
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error("Provider execution failed.");
    const message = normalized.message || "Provider execution failed.";
    const providerStatus = message.toLowerCase().includes("setup") ? "setup_needed" : "provider_unavailable";
    return {
      ...base,
      status: "fallback",
      generationMode: "fallback",
      provider: selectedProvider,
      model: selectedModel,
      executedProvider: null,
      executedModel: null,
      routeEnforced: false,
      routeMismatchReason: message.includes("Selected provider") ? message : null,
      fallbackReason: message,
      output: fallbackOutput,
      rawText: null,
      warnings: ["Provider call failed; deterministic fallback used."],
      parserWarnings: [],
      providerStatus,
    };
  }
}
