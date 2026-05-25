import { listAgentPolicies, getAgentPolicy } from "./agents/registry";
import { aiUsageAnalytics } from "./analytics/usageAnalytics";
import { aiApprovalQueue } from "./approval/approvalQueue";
import { mediaJobManager } from "./jobs/mediaJobManager";
import { runComplianceModeration } from "./moderation/compliance";
import {
  executeWithFallback,
  getProviderHealth,
  getProviderRuntimeDiagnostics,
  isProviderAvailableForTask,
  ProviderSelectionError,
} from "./providers/providerRegistry";
import { orderCopywritingProviders } from "./providerRouting";
import { getTaskDefinition, listTaskDefinitions } from "./tasks/taskRegistry";
import { aiKnowledgeLibrary } from "./knowledge/templates";
import {
  normalizeProviderOutput,
  persistProviderOutput,
} from "./outputNormalization";
import type {
  AIExecutionRequest,
  AIExecutionResponse,
  AITask,
  AIProviderName,
} from "./types";
import { getRuntimeConfig } from "../../dynamicConfig";
import { getQueueStatus } from "../../modules/growth-engine";
import { STORAGE_ROOT, ensureStorageDirs } from "../storage/localMediaStorage";

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

const playableTaskSet = new Set<AITask>([
  "text_to_image",
  "image_edit",
  "image_to_video",
  "text_to_video",
  "avatar_video",
  "text_to_speech",
]);

async function resolveProviderForTask(task: AITask): Promise<AIProviderName> {
  const def = getTaskDefinition(task);
  if (task === "copywriting" || task === "chat") {
    const preferred = (await getRuntimeConfig("copywriting_provider", "COPYWRITING_PROVIDER")).toLowerCase();
    if (preferred === "qwen" && (await isProviderAvailableForTask("qwen", task))) return "qwen";
    if (preferred === "genx" && (await isProviderAvailableForTask("genx", task))) return "genx";
    if (preferred === "huggingface" && (await isProviderAvailableForTask("huggingface", task))) return "huggingface";

    if (await isProviderAvailableForTask("genx", task)) return "genx";
    if (await isProviderAvailableForTask("qwen", task)) return "qwen";
    if (await isProviderAvailableForTask("huggingface", task)) return "huggingface";
  }
  return def.preferredProvider;
}

export async function resolveProvidersForTask(task: AITask): Promise<AIProviderName[]> {
  const taskDef = getTaskDefinition(task);
  if (task === "copywriting" || task === "chat") {
    const preferred = await getRuntimeConfig("copywriting_provider", "COPYWRITING_PROVIDER");
    const availability = {
      genx: await isProviderAvailableForTask("genx", task),
      qwen: await isProviderAvailableForTask("qwen", task),
      huggingface: await isProviderAvailableForTask("huggingface", task),
    } satisfies Record<AIProviderName, boolean>;
    return orderCopywritingProviders(
      preferred,
      (provider) => availability[provider],
    );
  }
  return [taskDef.preferredProvider, ...taskDef.fallbackProviders.filter((p) => p !== taskDef.preferredProvider)];
}

function mediaTypeFromTask(task: AITask): "image" | "video" | "avatar" | "voice" | "other" {
  if (task === "text_to_image" || task === "image_edit" || task === "image_captioning") return "image";
  if (task === "text_to_video" || task === "image_to_video") return "video";
  if (task === "avatar_video") return "avatar";
  if (task === "text_to_speech" || task === "speech_to_text") return "voice";
  return "other";
}

async function upsertMediaAssetByJob(opts: {
  jobId: string;
  task: AITask;
  tenantId: string;
  tenantType: string;
  userId?: number;
  provider: string;
  status: "processing" | "completed" | "failed";
  localPath?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  errorMessage?: string | null;
  prompt?: string;
  draftId?: string;
  outputMetadata?: Record<string, unknown>;
}) {
  const { createMediaAsset, getMediaAssetByJobId, updateMediaAsset } = await import("../../modules/growth-engine/mediaAssets");
  const existing = await getMediaAssetByJobId(opts.jobId);
  if (!existing) {
    await createMediaAsset({
      tenantId: opts.tenantId,
      tenantType: opts.tenantType,
      userId: opts.userId,
      jobId: opts.jobId,
      type: mediaTypeFromTask(opts.task),
      provider: opts.provider,
      task: opts.task,
      status: opts.status,
      localPath: opts.localPath ?? undefined,
      publicUrl: opts.publicUrl ?? undefined,
      mimeType: opts.mimeType ?? undefined,
      generationPrompt: opts.prompt,
      draftId: opts.draftId,
      outputMetadata: opts.outputMetadata,
      errorMessage: opts.errorMessage ?? undefined,
    });
    return;
  }
  await updateMediaAsset(existing.id, {
    status: opts.status,
    localPath: opts.localPath ?? undefined,
    publicUrl: opts.publicUrl ?? undefined,
    mimeType: opts.mimeType ?? undefined,
    errorMessage: opts.errorMessage ?? undefined,
    outputMetadata: opts.outputMetadata,
  });
}

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

  const requiresApproval = request.requiresApproval ?? taskDef.requiresApprovalByDefault;
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
    const providers = await resolveProvidersForTask(request.task);
    const provider = providers[0];
    if (!provider) {
      throw new ProviderSelectionError("provider_missing", `No configured provider is available for task "${request.task}"`);
    }
    const job = await mediaJobManager.createJob(request.task, provider, request.input, request.tenantScope);
    const capturedTask = request.task;
    const capturedTenantScope = request.tenantScope;
    const capturedInput = request.input;

    try {
      await upsertMediaAssetByJob({
        jobId: job.id,
        task: capturedTask,
        tenantId: capturedTenantScope?.tenantId ?? "global",
        tenantType: capturedTenantScope?.tenantType ?? "individual",
        userId: capturedTenantScope?.initiatedByUserId,
        provider,
        status: "processing",
        prompt: typeof capturedInput.prompt === "string" ? capturedInput.prompt : undefined,
        draftId: typeof capturedInput.draftId === "string" ? capturedInput.draftId : undefined,
        outputMetadata: { resultType: "job_pending" },
      });
    } catch {
      // non-critical
    }

    setTimeout(async () => {
      try {
        await mediaJobManager.transition(job.id, "processing");
        const result = await executeWithFallback(
          providers,
          capturedTask,
          capturedInput,
          request.timeoutMs ?? taskDef.timeoutMs,
          request.maxRetries ?? 1,
        );

        const normalised = normalizeProviderOutput({
          output: result.output,
          provider: result.provider,
          model: result.model,
          task: capturedTask,
          latencyMs: result.latencyMs,
        });
        const persisted = await persistProviderOutput({
          normalised,
          output: result.output,
          task: capturedTask,
          jobId: job.id,
        });

        await mediaJobManager.transition(job.id, "completed", {
          outputs: {
            ...persisted,
            raw: result.output,
          },
        });

        try {
          await upsertMediaAssetByJob({
            jobId: job.id,
            task: capturedTask,
            tenantId: capturedTenantScope?.tenantId ?? "global",
            tenantType: capturedTenantScope?.tenantType ?? "individual",
            userId: capturedTenantScope?.initiatedByUserId,
            provider: result.provider,
            status: persisted.resultType === "failed" ? "failed" : "completed",
            localPath: persisted.localPath,
            publicUrl: persisted.publicUrl,
            mimeType: persisted.mimeType,
            prompt: typeof capturedInput.prompt === "string" ? capturedInput.prompt : undefined,
            draftId: typeof capturedInput.draftId === "string" ? capturedInput.draftId : undefined,
            errorMessage: persisted.errorMessage,
            outputMetadata: {
              provider: result.provider,
              model: result.model,
              resultType: persisted.resultType,
              providerJobId: persisted.providerJobId,
              remoteUrl: persisted.remoteUrl,
              latencyMs: result.latencyMs,
            },
          });
        } catch {
          // non-critical
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await mediaJobManager.transition(job.id, "failed", { error: message });
        try {
          await upsertMediaAssetByJob({
            jobId: job.id,
            task: capturedTask,
            tenantId: capturedTenantScope?.tenantId ?? "global",
            tenantType: capturedTenantScope?.tenantType ?? "individual",
            userId: capturedTenantScope?.initiatedByUserId,
            provider,
            status: "failed",
            errorMessage: message,
            outputMetadata: { resultType: "failed" },
          });
        } catch {
          // non-critical
        }
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

  const providers = await resolveProvidersForTask(request.task);
  if (!providers.length) {
    throw new ProviderSelectionError("provider_missing", `No configured provider is available for task "${request.task}"`);
  }
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
  const copywritingProviders = await resolveProvidersForTask("copywriting");
  const providerHealth = await getProviderHealth();
  const providerRuntime = getProviderRuntimeDiagnostics();
  const analytics = aiUsageAnalytics.getSummary();
  const queueStatus = await getQueueStatus();
  const [mediaJobs, approvals, pendingApprovals, processingJobs] = await Promise.all([
    mediaJobManager.list(),
    aiApprovalQueue.list(),
    aiApprovalQueue.list({ status: "needs_review" }),
    mediaJobManager.list({ state: "processing" }),
  ]);

  let storageStatus: Record<string, unknown> = { root: STORAGE_ROOT, available: false };
  try {
    await ensureStorageDirs();
    storageStatus = { root: STORAGE_ROOT, available: true };
  } catch (error) {
    storageStatus = {
      root: STORAGE_ROOT,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const taskRegistry = listTaskDefinitions();
  const taskCapabilities = taskRegistry.map((task) => ({
    task: task.task,
    preferredProvider: task.preferredProvider,
    fallbackProviders: task.fallbackProviders,
    playableMediaCapable: playableTaskSet.has(task.task),
    promptOnly: !playableTaskSet.has(task.task),
  }));

  return {
    providerHealth,
    providerRuntime,
    usage: analytics.providerUsage,
    taskStats: analytics.taskCounts,
    recentFailures: analytics.recentFailures,
    recentUsage: analytics.recentUsage,
    queueStatus,
    copywritingRouting: {
      activeProvider: copywritingProviders[0] ?? null,
      candidates: copywritingProviders,
    },
    queue: {
      mediaJobs: mediaJobs.slice(0, 50),
      approvals: approvals.slice(0, 50),
      pendingApprovals: pendingApprovals.length,
      processingJobs: processingJobs.length,
    },
    taskCapabilities,
    agents: listAgentPolicies(),
    taskRegistry,
    knowledge: aiKnowledgeLibrary,
    storageStatus,
    limits: {
      maxJobsPerDay: 250,
      maxVideosPerDay: 50,
      maxAvatarJobsPerDay: 20,
    },
  };
}
