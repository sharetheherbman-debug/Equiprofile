import { listAgentPolicies, getAgentPolicy } from "./agents/registry";
import { aiUsageAnalytics } from "./analytics/usageAnalytics";
import { aiApprovalQueue } from "./approval/approvalQueue";
import { mediaJobManager } from "./jobs/mediaJobManager";
import { runComplianceModeration } from "./moderation/compliance";
import { executeWithFallback, getProviderHealth } from "./providers/providerRegistry";
import { getTaskDefinition, listTaskDefinitions } from "./tasks/taskRegistry";
import { aiKnowledgeLibrary } from "./knowledge/templates";
import type { AIExecutionRequest, AIExecutionResponse, AITask, AIProviderName } from "./types";

const mediaTasks = new Set<AITask>([
  "text_to_image",
  "image_edit",
  "image_to_video",
  "text_to_video",
  "avatar_video",
  "speech_to_text",
  "text_to_speech",
  "image_captioning",
]);

const resolveAgent = (agentId: AIExecutionRequest["agentId"]) => {
  if (!agentId) return undefined;
  return getAgentPolicy(agentId);
};

const providerForTask = (task: AITask): AIProviderName => getTaskDefinition(task).preferredProvider;

// ─── Provider output normalisation ───────────────────────────────────────────

type NormalisedOutput = {
  resultType: "playable_video" | "viewable_image" | "avatar_video" | "voice_audio" | "prompt_only" | "failed";
  publicUrl: string | null;
  mimeType: string | null;
  base64Data: string | null;
  promptText: string | null;
};

function normaliseProviderOutput(output: unknown): NormalisedOutput {
  if (!output) {
    return { resultType: "prompt_only", publicUrl: null, mimeType: null, base64Data: null, promptText: null };
  }

  const obj =
    typeof output === "object" && output !== null ? (output as Record<string, unknown>) : {};

  // URL-based output
  const url = (obj.url ?? obj.publicUrl ?? obj.imageUrl ?? obj.videoUrl ?? obj.audioUrl) as
    | string
    | undefined;
  if (url && typeof url === "string" && (url.startsWith("http") || url.startsWith("/"))) {
    const mime = guessMimeFromUrl(url);
    return {
      resultType: resultTypeFromMimeAndTask(mime, ""),
      publicUrl: url,
      mimeType: mime,
      base64Data: null,
      promptText: null,
    };
  }

  // Base64-encoded output
  const b64 = (obj.base64 ?? obj.image_base64 ?? obj.data) as string | undefined;
  if (b64 && typeof b64 === "string" && b64.length > 100) {
    const mime = ((obj.mime_type ?? obj.mimeType ?? "image/png") as string);
    return {
      resultType: resultTypeFromMimeAndTask(mime, ""),
      publicUrl: null,
      mimeType: mime,
      base64Data: b64,
      promptText: null,
    };
  }

  // Text/prompt-only output
  const text = (obj.text ?? obj.content ?? obj.prompt ?? (typeof output === "string" ? output : null)) as
    | string
    | undefined;
  if (text && typeof text === "string") {
    return {
      resultType: "prompt_only",
      publicUrl: null,
      mimeType: null,
      base64Data: null,
      promptText: text,
    };
  }

  return { resultType: "prompt_only", publicUrl: null, mimeType: null, base64Data: null, promptText: null };
}

function guessMimeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".mp4") || lower.includes("/video")) return "video/mp4";
  if (lower.includes(".webm")) return "video/webm";
  if (lower.includes(".mp3") || lower.includes(".mpeg")) return "audio/mpeg";
  if (lower.includes(".wav")) return "audio/wav";
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

function resultTypeFromMimeAndTask(mime: string, task: string): NormalisedOutput["resultType"] {
  if (task === "avatar_video") return "avatar_video";
  if (mime.startsWith("video/")) return "playable_video";
  if (mime.startsWith("audio/")) return "voice_audio";
  if (mime.startsWith("image/")) return "viewable_image";
  return "prompt_only";
}

function mediaTypeFromTask(task: string): "image" | "video" | "avatar" | "voice" | "other" {
  if (task === "text_to_image" || task === "image_edit" || task === "image_captioning") return "image";
  if (task === "text_to_video" || task === "image_to_video") return "video";
  if (task === "avatar_video") return "avatar";
  if (task === "text_to_speech" || task === "speech_to_text") return "voice";
  return "other";
}

// ─── AI task execution ────────────────────────────────────────────────────────

export async function executeAITask(request: AIExecutionRequest): Promise<AIExecutionResponse> {
  const taskDef = getTaskDefinition(request.task);
  taskDef.validateInput(request.input);

  const agent = resolveAgent(request.agentId);
  if (agent) {
    if (!agent.allowedTasks.includes(request.task)) {
      throw new Error(`${agent.id} is not allowed to execute task ${request.task}`);
    }
    if (agent.restrictedTasks.includes(request.task)) {
      throw new Error(`${agent.id} is restricted from task ${request.task}`);
    }
  }

  const moderation = runComplianceModeration(request.task, request.input);
  if (moderation.blocked) {
    return {
      status: "needs_review",
      task: request.task,
      moderation: {
        blocked: true,
        reasons: moderation.reasons,
        escalation: moderation.escalation,
      },
    };
  }

  const requiresApproval =
    request.requiresApproval ?? taskDef.requiresApprovalByDefault;

  if (requiresApproval) {
    const draft = await aiApprovalQueue.createDraft(request.task, request.input, request.tenantScope);
    const queued = await aiApprovalQueue.submitForReview(draft.id);
    return {
      status: "needs_review",
      task: request.task,
      approvalId: queued.id,
      moderation: {
        blocked: false,
        reasons: moderation.reasons,
        escalation: moderation.escalation,
      },
    };
  }

  if (taskDef.requiresQueue || mediaTasks.has(request.task)) {
    const provider = providerForTask(request.task);
    const job = await mediaJobManager.createJob(request.task, provider, request.input, request.tenantScope);

    // Capture for use in async closure
    const capturedTask = request.task;
    const capturedTenantScope = request.tenantScope;
    const capturedInput = request.input;

    setTimeout(async () => {
      try {
        await mediaJobManager.transition(job.id, "processing");
        const providers = [taskDef.preferredProvider, ...taskDef.fallbackProviders];
        const result = await executeWithFallback(
          providers,
          capturedTask,
          capturedInput,
          request.timeoutMs ?? taskDef.timeoutMs,
          request.maxRetries ?? 1,
        );

        // Normalise output for structured persistence
        const normalised = normaliseProviderOutput(result.output);
        await mediaJobManager.transition(job.id, "completed", {
          outputs: {
            ...normalised,
            raw: result.output,
          },
        });

        // Register in media asset registry (non-critical — failure does not fail the job)
        if (normalised.resultType !== "prompt_only" && normalised.resultType !== "failed") {
          try {
            const { createMediaAsset } = await import("../../modules/growth-engine/mediaAssets");
            await createMediaAsset({
              tenantId: capturedTenantScope?.tenantId ?? "global",
              tenantType: capturedTenantScope?.tenantType ?? "individual",
              userId: capturedTenantScope?.initiatedByUserId,
              jobId: job.id,
              type: mediaTypeFromTask(capturedTask),
              provider: result.provider,
              task: capturedTask,
              status: "completed",
              publicUrl: normalised.publicUrl ?? undefined,
              mimeType: normalised.mimeType ?? undefined,
              generationPrompt:
                typeof capturedInput?.prompt === "string" ? capturedInput.prompt : undefined,
              generationSettings: capturedInput as Record<string, unknown>,
              outputMetadata: {
                provider: result.provider,
                model: result.model,
                resultType: normalised.resultType,
              },
            });
          } catch {
            // Asset registration is non-critical — the media job completes regardless
          }
        }
      } catch (error) {
        await mediaJobManager.transition(job.id, "failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 0);

    return {
      status: "queued",
      task: request.task,
      jobId: job.id,
      provider,
      moderation: {
        blocked: false,
        reasons: moderation.reasons,
        escalation: moderation.escalation,
      },
    };
  }

  const providers = [taskDef.preferredProvider, ...taskDef.fallbackProviders];
  const result = await executeWithFallback(
    providers,
    request.task,
    request.input,
    request.timeoutMs ?? taskDef.timeoutMs,
    request.maxRetries ?? 1,
  );

  return {
    status: "completed",
    task: request.task,
    provider: result.provider,
    model: result.model,
    output: result.output,
    moderation: {
      blocked: false,
      reasons: moderation.reasons,
      escalation: moderation.escalation,
    },
  };
}

export async function getAIDiagnostics() {
  const providerHealth = await getProviderHealth();
  const analytics = aiUsageAnalytics.getSummary();
  const [mediaJobs, approvals, pendingApprovals, processingJobs] = await Promise.all([
    mediaJobManager.list(),
    aiApprovalQueue.list(),
    aiApprovalQueue.list({ status: "needs_review" }),
    mediaJobManager.list({ state: "processing" }),
  ]);

  return {
    providerHealth,
    usage: analytics.providerUsage,
    taskStats: analytics.taskCounts,
    recentFailures: analytics.recentFailures,
    recentUsage: analytics.recentUsage,
    queue: {
      mediaJobs: mediaJobs.slice(0, 50),
      approvals: approvals.slice(0, 50),
      pendingApprovals: pendingApprovals.length,
      processingJobs: processingJobs.length,
    },
    agents: listAgentPolicies(),
    taskRegistry: listTaskDefinitions(),
    knowledge: aiKnowledgeLibrary,
    limits: {
      maxJobsPerDay: 250,
      maxVideosPerDay: 50,
      maxAvatarJobsPerDay: 20,
    },
  };
}

const mediaTasks = new Set<AITask>([
  "text_to_image",
  "image_edit",
  "image_to_video",
  "text_to_video",
  "avatar_video",
  "speech_to_text",
  "text_to_speech",
  "image_captioning",
]);

const resolveAgent = (agentId: AIExecutionRequest["agentId"]) => {
  if (!agentId) return undefined;
  return getAgentPolicy(agentId);
};

const providerForTask = (task: AITask): AIProviderName => getTaskDefinition(task).preferredProvider;

export async function executeAITask(request: AIExecutionRequest): Promise<AIExecutionResponse> {
  const taskDef = getTaskDefinition(request.task);
  taskDef.validateInput(request.input);

  const agent = resolveAgent(request.agentId);
  if (agent) {
    if (!agent.allowedTasks.includes(request.task)) {
      throw new Error(`${agent.id} is not allowed to execute task ${request.task}`);
    }
    if (agent.restrictedTasks.includes(request.task)) {
      throw new Error(`${agent.id} is restricted from task ${request.task}`);
    }
  }

  const moderation = runComplianceModeration(request.task, request.input);
  if (moderation.blocked) {
    return {
      status: "needs_review",
      task: request.task,
      moderation: {
        blocked: true,
        reasons: moderation.reasons,
        escalation: moderation.escalation,
      },
    };
  }

  const requiresApproval =
    request.requiresApproval ?? taskDef.requiresApprovalByDefault;

  if (requiresApproval) {
    const draft = await aiApprovalQueue.createDraft(request.task, request.input, request.tenantScope);
    const queued = await aiApprovalQueue.submitForReview(draft.id);
    return {
      status: "needs_review",
      task: request.task,
      approvalId: queued.id,
      moderation: {
        blocked: false,
        reasons: moderation.reasons,
        escalation: moderation.escalation,
      },
    };
  }

  if (taskDef.requiresQueue || mediaTasks.has(request.task)) {
    const provider = providerForTask(request.task);
    const job = await mediaJobManager.createJob(request.task, provider, request.input, request.tenantScope);

    setTimeout(async () => {
      try {
        await mediaJobManager.transition(job.id, "processing");
        const providers = [taskDef.preferredProvider, ...taskDef.fallbackProviders];
        const result = await executeWithFallback(
          providers,
          request.task,
          request.input,
          request.timeoutMs ?? taskDef.timeoutMs,
          request.maxRetries ?? 1,
        );
        await mediaJobManager.transition(job.id, "completed", { outputs: result.output });
      } catch (error) {
        await mediaJobManager.transition(job.id, "failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 0);

    return {
      status: "queued",
      task: request.task,
      jobId: job.id,
      provider,
      moderation: {
        blocked: false,
        reasons: moderation.reasons,
        escalation: moderation.escalation,
      },
    };
  }

  const providers = [taskDef.preferredProvider, ...taskDef.fallbackProviders];
  const result = await executeWithFallback(
    providers,
    request.task,
    request.input,
    request.timeoutMs ?? taskDef.timeoutMs,
    request.maxRetries ?? 1,
  );

  return {
    status: "completed",
    task: request.task,
    provider: result.provider,
    model: result.model,
    output: result.output,
    moderation: {
      blocked: false,
      reasons: moderation.reasons,
      escalation: moderation.escalation,
    },
  };
}

export async function getAIDiagnostics() {
  const providerHealth = await getProviderHealth();
  const analytics = aiUsageAnalytics.getSummary();
  const [mediaJobs, approvals, pendingApprovals, processingJobs] = await Promise.all([
    mediaJobManager.list(),
    aiApprovalQueue.list(),
    aiApprovalQueue.list({ status: "needs_review" }),
    mediaJobManager.list({ state: "processing" }),
  ]);

  return {
    providerHealth,
    usage: analytics.providerUsage,
    taskStats: analytics.taskCounts,
    recentFailures: analytics.recentFailures,
    recentUsage: analytics.recentUsage,
    queue: {
      mediaJobs: mediaJobs.slice(0, 50),
      approvals: approvals.slice(0, 50),
      pendingApprovals: pendingApprovals.length,
      processingJobs: processingJobs.length,
    },
    agents: listAgentPolicies(),
    taskRegistry: listTaskDefinitions(),
    knowledge: aiKnowledgeLibrary,
    limits: {
      maxJobsPerDay: 250,
      maxVideosPerDay: 50,
      maxAvatarJobsPerDay: 20,
    },
  };
}
