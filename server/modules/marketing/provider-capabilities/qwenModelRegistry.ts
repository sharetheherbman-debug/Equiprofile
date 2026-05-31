import type { ProviderModelDescriptor } from "../../../_core/ai/modelRegistry";

export function getConfiguredQwenModels(models: ProviderModelDescriptor[]) {
  return models.filter((model) => model.provider === "qwen");
}
