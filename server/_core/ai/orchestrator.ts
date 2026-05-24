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
