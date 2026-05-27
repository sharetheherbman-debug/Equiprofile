import { discoverProviderModels, categoryForExecutableTask } from "./modelRegistry";
import type { AIProviderName, AITask } from "./types";

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
      for (const task of model.executableTasks) {
        rows.push({
          provider: model.provider,
          capability: categoryForExecutableTask(task),
          task,
          modelId: model.id,
          modelName: model.id,
          category: categoryForExecutableTask(task),
          endpointFamily: model.endpointFamily,
          supportsAsync: model.executionMode === "async",
          supportsFileResult: model.endpointFamily === "genx_async_job" || model.endpointFamily === "dashscope_native_media" || model.endpointFamily === "hf_inference",
          supportsWebhook: false,
          outputTypes: outputTypesForTask(task),
          inputTypes: inputTypesForTask(task),
          status: model.executionMode === "not_executable" ? "setup_needed" : "ready",
          source: model.source,
          lastDiscoveredAt: snapshot.discoveredAt,
          lastTestedAt: model.lastTestedTimestamp ?? null,
          lastError: model.lastErrorReason ?? null,
        });
      }
    }
  }
  return rows;
}
