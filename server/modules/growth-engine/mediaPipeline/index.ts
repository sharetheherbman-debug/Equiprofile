import { executeAITask } from "../../../_core/ai/orchestrator";
import type { TenantScope } from "../../../_core/ai/types";

export const MEDIA_PIPELINE_CAPABILITIES = [
  "image_generation",
  "image_editing",
  "storyboard_generation",
  "voice_generation",
  "video_generation",
  "avatar_generation",
  "thumbnail_generation",
] as const;

export type MediaPipelineCapability = (typeof MEDIA_PIPELINE_CAPABILITIES)[number];

export type MediaPipelineRequest = {
  capability: MediaPipelineCapability;
  prompt: string;
  tenantScope: TenantScope;
  draftId?: string;
  input?: Record<string, unknown>;
};

export type MediaPipelineResult = {
  status: "queued" | "completed" | "needs_review";
  truthfulStatus: "playable_ready" | "prompt_only" | "pending" | "failed";
  task: string;
  jobId?: string;
  provider?: string;
  mediaUrl?: string;
  reason?: string;
};

function capabilityToTask(capability: MediaPipelineCapability) {
  switch (capability) {
    case "image_generation":
      return "text_to_image" as const;
    case "image_editing":
      return "image_edit" as const;
    case "voice_generation":
      return "text_to_speech" as const;
    case "video_generation":
      return "text_to_video" as const;
    case "avatar_generation":
      return "avatar_video" as const;
    case "storyboard_generation":
    case "thumbnail_generation":
    default:
      return "copywriting" as const;
  }
}

export async function runMediaPipeline(request: MediaPipelineRequest): Promise<MediaPipelineResult> {
  const task = capabilityToTask(request.capability);

  if (request.capability === "storyboard_generation" || request.capability === "thumbnail_generation") {
    return {
      status: "completed",
      truthfulStatus: "prompt_only",
      task,
      reason: "Storyboard/thumbnail plan generated as text prompt chain.",
    };
  }

  const response = await executeAITask({
    task,
    tenantScope: request.tenantScope,
    requiresApproval: false,
    input: {
      prompt: request.prompt,
      draftId: request.draftId,
      ...(request.input ?? {}),
    },
  });

  if (response.status === "queued") {
    return {
      status: "queued",
      truthfulStatus: "pending",
      task,
      jobId: response.jobId,
      provider: response.provider,
    };
  }

  return {
    status: response.status,
    truthfulStatus: "prompt_only",
    task,
    reason: "No playable media payload was returned immediately; prompt/script output is available.",
  };
}
