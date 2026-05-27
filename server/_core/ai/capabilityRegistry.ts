import { discoverProviderModels, categoryForExecutableTask, resolveModelCandidatesForTask } from "./modelRegistry";
import { CANONICAL_AI_TASKS, type AIProviderName, type AITask } from "./types";

export type ProviderCapabilityRegistryRow = {
  provider: AIProviderName;
  capability: string;
  task: AITask;
  modelId: string;
  modelName: string;
  category: string;
  endpointFamily: string;
  supportsAsync: boolean;
  supportsFileResult: boolean;
  supportsWebhook: boolean;
  supportsPlayableMedia: boolean;
  supportsImageToVideo: boolean;
  supportsAvatar: boolean;
  outputTypes: string[];
  inputTypes: string[];
  status: "ready" | "setup_needed";
  source: string;
  lastDiscoveredAt: string;
  lastTestedAt: string | null;
  lastError: string | null;
};

function outputTypesForTask(task: AITask): string[] {
  if (task === "text_to_image" || task === "image_edit") return ["image"];
  if (task === "text_to_video" || task === "image_to_video" || task === "avatar_video") return ["video"];
  if (task === "text_to_speech") return ["audio"];
  if (task === "speech_to_text") return ["text"];
  return ["text", "json"];
}

function inputTypesForTask(task: AITask): string[] {
  if (task === "image_to_video" || task === "image_edit" || task === "image_captioning") return ["image", "text"];
  if (task === "speech_to_text") return ["audio"];
  if (task === "avatar_video") return ["text", "image"];
  return ["text"];
}

export async function getProviderCapabilityRegistryRows(): Promise<ProviderCapabilityRegistryRow[]> {
  const snapshot = await discoverProviderModels();
  const rows: ProviderCapabilityRegistryRow[] = [];
  for (const models of Object.values(snapshot.providers)) {
    for (const model of models) {
      const unavailableTasks = Object.keys(model.unavailableReasonsByTask ?? {}) as AITask[];
      const rowTasks = Array.from(new Set([...model.executableTasks, ...unavailableTasks]));
      for (const task of rowTasks) {
        const isExecutable = model.executableTasks.includes(task);
        const setupReason = model.unavailableReasonsByTask?.[task];
        rows.push({
          provider: model.provider,
          capability: categoryForExecutableTask(task),
          task,
          modelId: model.id,
          modelName: model.id,
          category: categoryForExecutableTask(task),
          endpointFamily: model.endpointFamily,
          supportsAsync: isExecutable && model.executionMode === "async",
          supportsFileResult: model.endpointFamily === "genx_async_job" || model.endpointFamily === "dashscope_native_media" || model.endpointFamily === "hf_inference",
          supportsWebhook: false,
          supportsPlayableMedia: model.supportsPlayableMedia,
          supportsImageToVideo: model.supportsImageToVideo,
          supportsAvatar: model.supportsAvatar,
          outputTypes: outputTypesForTask(task),
          inputTypes: inputTypesForTask(task),
          status: isExecutable && model.executionMode !== "not_executable" ? "ready" : "setup_needed",
          source: model.source,
          lastDiscoveredAt: snapshot.discoveredAt,
          lastTestedAt: model.lastTestedTimestamp ?? null,
          lastError: setupReason ?? model.lastErrorReason ?? null,
        });
      }
    }
  }
  return rows;
}

export type EffectiveTaskRoutingDiagnostic = {
  task: AITask;
  primary: {
    provider: AIProviderName;
    modelId: string;
    endpointFamily: string;
    outputTypes: string[];
    inputTypes: string[];
    pollingEndpoint: string | null;
  } | null;
  fallback: Array<{
    provider: AIProviderName;
    modelId: string;
    endpointFamily: string;
  }>;
};

export async function getEffectiveTaskRoutingDiagnostics(): Promise<EffectiveTaskRoutingDiagnostic[]> {
  await discoverProviderModels();
  const diagnostics = await Promise.all(
    CANONICAL_AI_TASKS.map(async (task) => {
      const candidates = await resolveModelCandidatesForTask(task);
      const primary = candidates[0];
      return {
        task,
        primary: primary
          ? {
            provider: primary.provider,
            modelId: primary.id,
            endpointFamily: primary.endpointFamily,
            outputTypes: outputTypesForTask(task),
            inputTypes: inputTypesForTask(task),
            pollingEndpoint: primary.endpointFamily === "genx_async_job" ? "/api/v1/jobs/:id" : null,
          }
          : null,
        fallback: candidates.slice(1, 4).map((candidate) => ({
          provider: candidate.provider,
          modelId: candidate.id,
          endpointFamily: candidate.endpointFamily,
        })),
      } satisfies EffectiveTaskRoutingDiagnostic;
    }),
  );
  return diagnostics;
}
