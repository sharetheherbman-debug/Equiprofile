import type { AIProviderName, AITask } from "../types";

export type TaskDefinition = {
  task: AITask;
  preferredProvider: AIProviderName;
  fallbackProviders: AIProviderName[];
  timeoutMs: number;
  requiresQueue: boolean;
  requiresApprovalByDefault: boolean;
  validateInput: (input: Record<string, unknown>) => void;
};

const ensureObject = (input: Record<string, unknown>) => {
  if (!input || typeof input !== "object") {
    throw new Error("Task input must be an object");
  }
};

const requireKey = (input: Record<string, unknown>, key: string) => {
  if (!(key in input)) {
    throw new Error(`Task input missing required field: ${key}`);
  }
};

const mk = (
  task: AITask,
  preferredProvider: AIProviderName,
  fallbackProviders: AIProviderName[],
  timeoutMs: number,
  requiresQueue: boolean,
  requiresApprovalByDefault: boolean,
  requiredKeys: string[] = [],
): TaskDefinition => ({
  task,
  preferredProvider,
  fallbackProviders,
  timeoutMs,
  requiresQueue,
  requiresApprovalByDefault,
  validateInput: (input) => {
    ensureObject(input);
    for (const key of requiredKeys) requireKey(input, key);
  },
});

const TASKS: Record<AITask, TaskDefinition> = {
  chat: mk("chat", "genx", ["qwen", "huggingface"], 20_000, false, false, ["messages"]),
  copywriting: mk("copywriting", "genx", ["qwen", "huggingface"], 20_000, false, true, ["prompt"]),
  strategy: mk("strategy", "genx", ["qwen", "huggingface"], 20_000, false, true, ["prompt"]),
  campaign_generation: mk("campaign_generation", "genx", ["qwen", "huggingface"], 25_000, false, true, ["prompt"]),
  social_generation: mk("social_generation", "genx", ["qwen", "huggingface"], 20_000, false, true, ["prompt"]),
  email_generation: mk("email_generation", "genx", ["qwen", "huggingface"], 20_000, false, true, ["prompt"]),
  text_to_image: mk("text_to_image", "huggingface", ["genx"], 60_000, true, true, ["prompt"]),
  image_edit: mk("image_edit", "huggingface", ["genx"], 60_000, true, true, ["image", "prompt"]),
  image_to_video: mk("image_to_video", "huggingface", ["genx"], 120_000, true, true, ["image"]),
  text_to_video: mk("text_to_video", "huggingface", ["genx"], 120_000, true, true, ["prompt"]),
  avatar_video: mk("avatar_video", "huggingface", ["genx"], 120_000, true, true, ["script"]),
  speech_to_text: mk("speech_to_text", "huggingface", ["genx"], 30_000, true, false, ["audio"]),
  text_to_speech: mk("text_to_speech", "huggingface", ["genx"], 30_000, true, true, ["text"]),
  image_captioning: mk("image_captioning", "huggingface", ["genx"], 30_000, true, false, ["image"]),
  classification: mk("classification", "huggingface", ["genx"], 20_000, false, false, ["input"]),
  moderation: mk("moderation", "huggingface", ["genx"], 10_000, false, false, ["input"]),
  embeddings: mk("embeddings", "huggingface", ["genx"], 15_000, false, false, ["input"]),
  analytics: mk("analytics", "genx", ["qwen", "huggingface"], 20_000, false, false, ["input"]),
};

export function getTaskDefinition(task: AITask): TaskDefinition {
  return TASKS[task];
}

export function listTaskDefinitions(): TaskDefinition[] {
  return Object.values(TASKS);
}
