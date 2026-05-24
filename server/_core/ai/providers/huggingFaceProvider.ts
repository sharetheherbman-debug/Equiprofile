import { getRuntimeConfig } from "../../../dynamicConfig";
import type { AITask, TaskExecutionResult } from "../types";

const defaultModelByTask: Partial<Record<AITask, string>> = {
  text_to_image: "black-forest-labs/FLUX.1-schnell",
  image_edit: "stabilityai/stable-diffusion-xl-refiner-1.0",
  image_captioning: "Salesforce/blip-image-captioning-base",
  speech_to_text: "distil-whisper/distil-large-v3",
  text_to_speech: "suno/bark",
  moderation: "unitary/toxic-bert",
  embeddings: "sentence-transformers/all-MiniLM-L6-v2",
};

const abortableFetch = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export async function executeHuggingFaceTask(task: AITask, input: Record<string, unknown>, timeoutMs: number): Promise<TaskExecutionResult> {
  const key = await getRuntimeConfig("huggingface_api_key", "HUGGINGFACE_API_KEY");
  if (!key) {
    throw new Error("Hugging Face provider is not configured");
  }

  const modelKey = `hf_task_${task}_model`;
  const envModelKey = `HF_TASK_${task.toUpperCase()}_MODEL`;
  const model = (await getRuntimeConfig(modelKey, envModelKey)) || defaultModelByTask[task] || "meta-llama/Llama-3.1-8B-Instruct";

  const startedAt = Date.now();
  const response = await abortableFetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(input),
  }, timeoutMs);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hugging Face execution failed: ${response.status} ${text}`);
  }

  const payload = await response.json();

  return {
    provider: "huggingface",
    task,
    model,
    output: payload,
    latencyMs: Date.now() - startedAt,
  };
}
