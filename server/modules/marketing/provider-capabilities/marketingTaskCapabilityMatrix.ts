import type { AITask } from "../../../_core/ai/types";
import type { MarketingTaskCapabilityEntry } from "./providerCapabilityTypes";

const DEFAULT_STANDARD = ["qwen", "huggingface", "genx"] as const;
const DEFAULT_ELITE = ["genx", "qwen", "huggingface"] as const;

function entry(task: MarketingTaskCapabilityEntry["task"], canonicalTask: AITask, requiredOutput: MarketingTaskCapabilityEntry["requiredOutput"], opts?: Partial<MarketingTaskCapabilityEntry>): MarketingTaskCapabilityEntry {
  return {
    task,
    canonicalTask,
    routeType: "model",
    requiredOutput,
    standardPreference: [...DEFAULT_STANDARD],
    elitePreference: [...DEFAULT_ELITE],
    allowGenXFallbackInStandard: true,
    ...opts,
  };
}

export const MARKETING_TASK_CAPABILITY_MATRIX: Record<MarketingTaskCapabilityEntry["task"], MarketingTaskCapabilityEntry> = {
  campaign_strategy: entry("campaign_strategy", "strategy", "text"),
  hook_generation: entry("hook_generation", "copywriting", "text"),
  angle_generation: entry("angle_generation", "copywriting", "text"),
  platform_copywriting: entry("platform_copywriting", "copywriting", "text"),
  email_generation: entry("email_generation", "email_generation", "text"),
  blog_seo_generation: entry("blog_seo_generation", "copywriting", "text"),
  scriptwriting: entry("scriptwriting", "copywriting", "text"),
  scene_planning: entry("scene_planning", "strategy", "text"),
  prompt_direction: entry("prompt_direction", "strategy", "text"),
  localization: entry("localization", "copywriting", "text"),
  captioning: entry("captioning", "copywriting", "text"),
  transcription: entry("transcription", "speech_to_text", "audio"),
  voiceover: entry("voiceover", "text_to_speech", "voice"),
  image_generation: entry("image_generation", "text_to_image", "image"),
  text_to_video_scene_clip: entry("text_to_video_scene_clip", "text_to_video", "video"),
  visual_qa: entry("visual_qa", "image_captioning", "vision"),
  embedding: entry("embedding", "embeddings", "embedding"),
  qa_summary: entry("qa_summary", "classification", "text"),
  avatar_generation: entry("avatar_generation", "avatar_video", "video"),
  avatar_lipsync: entry("avatar_lipsync", "avatar_video", "video"),
  music_generation: entry("music_generation", "text_to_speech", "audio"),
  background_audio_selection: entry("background_audio_selection", "text_to_speech", "audio"),
};

export function getMarketingTaskCapabilityEntry(task: MarketingTaskCapabilityEntry["task"]): MarketingTaskCapabilityEntry {
  return MARKETING_TASK_CAPABILITY_MATRIX[task];
}

export function listMarketingTaskCapabilityEntries(): MarketingTaskCapabilityEntry[] {
  return Object.values(MARKETING_TASK_CAPABILITY_MATRIX);
}

export function isLongFormVideoRoute(task: MarketingTaskCapabilityEntry["task"]): boolean {
  return task === "scene_planning" || task === "scriptwriting";
}
