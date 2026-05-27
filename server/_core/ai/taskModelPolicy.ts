import type { AITask } from "./types";

export const TEXT_TO_VIDEO_MODEL_PRIORITY = [
  "kling-v2.5-turbo",
  "kling-v2.6-pro",
  "kling-v3-pro",
  "pixverse-v6",
  "pixverse-v5.5",
  "seedance-2",
  "seedance-v1-fast",
  "veo-3.1-fast",
  "grok-imagine-video",
] as const;

export const TEXT_TO_IMAGE_MODEL_PRIORITY = [
  "gpt-image-2",
  "grok-imagine",
  "recraft-v4.1",
  "nano-banana-pro",
  "genxlm-pro-v1-img",
] as const;

const TEXT_MODEL_MARKERS = [
  "gpt",
  "claude",
  "gemini",
  "llama",
  "mistral",
  "qwen",
  "chat",
  "sonnet",
  "reason",
  "text",
];

function lowerModel(modelId: string) {
  return modelId.trim().toLowerCase();
}

export function isAvatarVideoModel(modelId: string): boolean {
  const lower = lowerModel(modelId);
  return lower.includes("avatar") || lower.includes("talking") || lower.includes("presenter");
}

export function isImageToVideoModel(modelId: string): boolean {
  const lower = lowerModel(modelId);
  return lower.includes("i2v") || lower.includes("image-to-video") || lower.includes("image_to_video") || lower.includes("image2video");
}

export function isTextModel(modelId: string): boolean {
  const lower = lowerModel(modelId);
  return TEXT_MODEL_MARKERS.some((marker) => lower.includes(marker));
}

export function isPromptOnlyMediaModel(modelId: string): boolean {
  const lower = lowerModel(modelId);
  return lower.includes("prompt-only") || lower.includes("storyboard") || lower.includes("planner");
}

export function isTrueTextToVideoModel(modelId: string): boolean {
  const lower = lowerModel(modelId);
  if (isAvatarVideoModel(lower) || isImageToVideoModel(lower) || isTextModel(lower) || isPromptOnlyMediaModel(lower)) {
    return false;
  }
  if (TEXT_TO_VIDEO_MODEL_PRIORITY.includes(lower as (typeof TEXT_TO_VIDEO_MODEL_PRIORITY)[number])) {
    return true;
  }
  return ["kling", "pixverse", "seedance", "veo", "grok-imagine-video", "t2v", "text-to-video", "text_to_video", "sora", "runway", "hunyuan", "ltx", "minimax", "pika", "hailuo"]
    .some((marker) => lower.includes(marker));
}

export function isTextToImageModel(modelId: string): boolean {
  const lower = lowerModel(modelId);
  if (isTextModel(lower) && !lower.includes("image")) return false;
  if (TEXT_TO_IMAGE_MODEL_PRIORITY.includes(lower as (typeof TEXT_TO_IMAGE_MODEL_PRIORITY)[number])) return true;
  return ["image", "img", "recraft", "flux", "sdxl", "diffusion", "imagen", "grok-imagine", "nano-banana", "genxlm"].some((marker) => lower.includes(marker));
}

export function isTextToSpeechModel(modelId: string): boolean {
  const lower = lowerModel(modelId);
  return lower.includes("tts") || lower.includes("speech") || lower.includes("voice") || lower.includes("audio");
}

export function allowedTasksForGenXModel(modelId: string): AITask[] {
  const tasks: AITask[] = [];
  const lower = lowerModel(modelId);

  if (isTextModel(lower)) {
    tasks.push("chat", "copywriting", "strategy", "campaign_generation", "social_generation", "email_generation", "classification", "moderation", "analytics");
  }
  if (isTextToImageModel(lower)) {
    tasks.push("text_to_image", "image_edit");
  }
  if (isTrueTextToVideoModel(lower)) {
    tasks.push("text_to_video");
  }
  if (isImageToVideoModel(lower)) {
    tasks.push("image_to_video");
  }
  if (isAvatarVideoModel(lower)) {
    tasks.push("avatar_video");
  }
  if (isTextToSpeechModel(lower)) {
    tasks.push("text_to_speech");
  }
  if (lower.includes("vision") || lower.includes("caption") || lower.includes("vl")) {
    tasks.push("image_captioning");
  }

  return Array.from(new Set(tasks));
}

export function modelDisallowReasonForTask(task: AITask, modelId: string): string | null {
  const lower = lowerModel(modelId);
  if (task === "text_to_video") {
    if (isAvatarVideoModel(lower)) return "Avatar models require image_url and are not valid for text_to_video.";
    if (isImageToVideoModel(lower)) return "Image-to-video models require image_url and are not valid for text_to_video.";
    if (isTextModel(lower)) return "Text/chat models can create video plans only; they are not playable text_to_video models.";
    if (isPromptOnlyMediaModel(lower)) return "Prompt-only models are not playable text_to_video models.";
    return isTrueTextToVideoModel(lower) ? null : "Model is not classified as a true text_to_video model.";
  }
  if (task === "avatar_video") {
    return isAvatarVideoModel(lower) ? null : "Model is not classified as an avatar_video model.";
  }
  if (task === "image_to_video") {
    return isImageToVideoModel(lower) ? null : "Model is not classified as an image_to_video model.";
  }
  if (task === "text_to_image" || task === "image_edit") {
    return isTextToImageModel(lower) ? null : "Model is not classified as an image generation/editing model.";
  }
  if (task === "text_to_speech") {
    return isTextToSpeechModel(lower) ? null : "Model is not classified as a text_to_speech model.";
  }
  return null;
}

export function isModelAllowedForTask(task: AITask, modelId: string): boolean {
  return modelDisallowReasonForTask(task, modelId) === null;
}

export function taskPolicyPriority(task: AITask, modelId: string): number {
  const lower = lowerModel(modelId);
  const priority = task === "text_to_video"
    ? TEXT_TO_VIDEO_MODEL_PRIORITY
    : task === "text_to_image" || task === "image_edit"
      ? TEXT_TO_IMAGE_MODEL_PRIORITY
      : [];
  const index = priority.indexOf(lower as never);
  if (index >= 0) return 10_000 - index;
  if (task === "avatar_video" && isAvatarVideoModel(lower)) return 5_000;
  if (task === "image_to_video" && isImageToVideoModel(lower)) return 5_000;
  if (task === "text_to_speech" && lower === "grok-tts") return 5_000;
  return 0;
}

export function extractImageUrl(input: Record<string, unknown>): string | null {
  for (const key of ["image_url", "imageUrl", "image", "referenceImageUrl", "uploadedAssetUrl"]) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function validateTaskInputForModel(task: AITask, modelId: string, input: Record<string, unknown>): { ok: true } | { ok: false; code: "setup_needed"; message: string } {
  const disallowReason = modelDisallowReasonForTask(task, modelId);
  if (disallowReason) return { ok: false, code: "setup_needed", message: disallowReason };
  if ((task === "avatar_video" || task === "image_to_video") && !extractImageUrl(input)) {
    return { ok: false, code: "setup_needed", message: `${task} requires image_url before this model can create playable media.` };
  }
  return { ok: true };
}

export function compareCandidatesByTaskPolicy<T extends { id: string; suitabilityScore?: number }>(task: AITask, a: T, b: T): number {
  const policyDelta = taskPolicyPriority(task, b.id) - taskPolicyPriority(task, a.id);
  if (policyDelta !== 0) return policyDelta;
  return (b.suitabilityScore ?? 0) - (a.suitabilityScore ?? 0);
}
