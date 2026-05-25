import type { AIProviderName } from "./types";

export function orderCopywritingProviders(
  preferredRaw: string,
  isAvailable: (provider: AIProviderName) => boolean,
): AIProviderName[] {
  const ordered: AIProviderName[] = [];
  const preferred = preferredRaw.toLowerCase();

  const push = (provider: AIProviderName) => {
    if (!ordered.includes(provider) && isAvailable(provider)) {
      ordered.push(provider);
    }
  };

  if (preferred === "genx") push("genx");
  if (preferred === "qwen") push("qwen");
  if (preferred === "huggingface") push("huggingface");

  push("genx");
  push("qwen");
  push("huggingface");

  return ordered;
}
