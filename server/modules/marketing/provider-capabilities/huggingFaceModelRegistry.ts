import type { ProviderModelDescriptor } from "../../../_core/ai/modelRegistry";

export function getTaskMappedHuggingFaceModels(models: ProviderModelDescriptor[]) {
  return models.filter((model) => model.provider === "huggingface");
}
