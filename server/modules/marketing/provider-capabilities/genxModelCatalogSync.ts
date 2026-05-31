import type { ProviderModelDescriptor } from "../../../_core/ai/modelRegistry";

export function getDiscoveredGenXModels(models: ProviderModelDescriptor[]) {
  return models.filter((model) => model.provider === "genx");
}
