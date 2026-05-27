import type { AITask } from "./types";

export type ModelQualityPolicy = {
  task: AITask;
  bestModels: string[];
  fastModels: string[];
  cheapModels: string[];
  fallbackModels: string[];
  maxDurationSeconds: number;
  knownWeaknesses: string[];
  avoidConditions: string[];
};

const POLICY: Partial<Record<AITask, ModelQualityPolicy>> = {
  text_to_video: {
    task: "text_to_video",
    bestModels: ["kling-v2.5-turbo", "kling-v2.6-pro"],
    fastModels: ["kling-v2.5-turbo", "veo-3.1-fast"],
    cheapModels: ["seedance-v1-fast", "pixverse-v6"],
    fallbackModels: ["kling-v2.6-pro", "pixverse-v6", "seedance-2", "veo-3.1-fast", "grok-imagine-video"],
    maxDurationSeconds: 15,
    knownWeaknesses: ["text distortion in raw footage", "occasional anatomy artifacts"],
    avoidConditions: ["avatar/i2v model families", "text-only planner models", "raw logo/domain rendering in prompt"],
  },
  text_to_image: {
    task: "text_to_image",
    bestModels: ["gpt-image-2"],
    fastModels: ["grok-imagine"],
    cheapModels: ["nano-banana-pro"],
    fallbackModels: ["grok-imagine", "recraft-v4.1", "nano-banana-pro"],
    maxDurationSeconds: 0,
    knownWeaknesses: ["text rendering artifacts"],
    avoidConditions: ["rendering logos/domains/text directly in model output"],
  },
};

export function getModelQualityPolicy(task: AITask): ModelQualityPolicy | null {
  return POLICY[task] ?? null;
}

export function getPreferredModelOrder(task: AITask): string[] {
  const policy = getModelQualityPolicy(task);
  if (!policy) return [];
  return Array.from(new Set([...policy.bestModels, ...policy.fastModels, ...policy.fallbackModels]));
}
