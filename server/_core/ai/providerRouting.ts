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

/**
 * Order media generation providers based on quality mode.
 * Standard: prefer cheaper/open providers first (Qwen → HuggingFace → GenX).
 * Elite:    prefer premium providers first (GenX → Qwen → HuggingFace).
 * No single model is hardcoded — caller must discover models from the provider catalogue.
 */
export function orderMediaProviders(
  qualityMode: string,
  isAvailable: (provider: AIProviderName) => boolean,
): AIProviderName[] {
  const ordered: AIProviderName[] = [];

  const push = (provider: AIProviderName) => {
    if (!ordered.includes(provider) && isAvailable(provider)) {
      ordered.push(provider);
    }
  };

  if (qualityMode === "elite") {
    push("genx");
    push("qwen");
    push("huggingface");
  } else {
    // standard — prefer cheaper / open providers first
    push("qwen");
    push("huggingface");
    push("genx");
  }

  return ordered;
}
