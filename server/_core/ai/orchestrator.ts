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
import { selectProviderOrderForTask } from "./providerCapabilities";
import { discoverProviderModels, resolveModelCandidatesForTask } from "./modelRegistry";
import { rankProvidersForTask } from "./providerRanking";
import { getTaskDefinition, listTaskDefinitions } from "./tasks/taskRegistry";
import { aiKnowledgeLibrary } from "./knowledge/templates";
import { getEffectiveTaskRoutingDiagnostics, getProviderCapabilityRegistryRows } from "./capabilityRegistry";
import {
  normalizeProviderOutput,
  persistProviderOutput,
} from "./outputNormalization";
import { updateGenerationLifecycle } from "./generationLifecycle";
import { recordProviderTelemetry } from "./providerTelemetry";
import { getProviderTelemetrySummary } from "./providerTelemetry";
import type {
  AIExecutionRequest,
  AIExecutionResponse,
  AITask,
  AIProviderName,
} from "./types";
import { getRuntimeConfig } from "../../dynamicConfig";
import { buildPlatformReadiness, getQueueStatus, listSocialConnections } from "../../modules/growth-engine";
import { STORAGE_ROOT, deleteAssetFile, ensureStorageDirs, writeTempFile } from "../storage/localMediaStorage";
import fs from "fs/promises";

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

async function probeOutboundNetwork(url: string, timeoutMs = 5000) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "HEAD", signal: controller.signal });
    return {
      url,
      status: response.ok ? "success" : "failed",
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      url,
      status: "failed",
      statusCode: null,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getOriginForProbe(url?: string) {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

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
  const ranked = await rankProvidersForTask(task);
  const rankedProviders = ranked.providers.map((item) => item.provider);
  const discovered = await selectProviderOrderForTask(task);
  const preferred = await getRuntimeConfig("copywriting_provider", "COPYWRITING_PROVIDER");
  const availableProviders: AIProviderName[] = [];

  for (const provider of Array.from(new Set([...rankedProviders, ...discovered]))) {
    if (await isProviderAvailableForTask(provider, task)) {
      availableProviders.push(provider);
    }
  }

  if ((task === "copywriting" || task === "chat") && availableProviders.length > 0) {
    return orderCopywritingProviders(
      preferred,
      (provider) => availableProviders.includes(provider),
    );
  }

  if (availableProviders.length > 0) {
    return availableProviders;
  }

  const taskDef = getTaskDefinition(task);
  return [taskDef.preferredProvider, ...taskDef.fallbackProviders.filter((p) => p !== taskDef.preferredProvider)];
}

function mediaTypeFromTask(task: AITask): "image" | "video" | "avatar" | "voice" | "other" {
  if (task === "text_to_image" || task === "image_edit" || task === "image_captioning") return "image";
  if (task === "text_to_video" || task === "image_to_video") return "video";
  if (task === "avatar_video") return "avatar";
  if (task === "text_to_speech" || task === "speech_to_text") return "voice";
  return "other";
}

type GenerationAttemptLog = {
  attempt: number;
  variant: "original" | "rewrite_prompt" | "same_model_retry" | "fallback_model" | "lower_duration";
  provider?: string;
  model?: string;
  prompt?: string;
  duration?: number;
  error?: string;
  outcome: "success" | "failed";
};

function buildVariantInput(input: Record<string, unknown>, attemptIndex: number): GenerationAttemptLog["variant"] {
  if (attemptIndex === 0) return "original";
  if (attemptIndex === 1) return "rewrite_prompt";
  if (attemptIndex === 2) return "same_model_retry";
  if (attemptIndex === 3) return "fallback_model";
  return "lower_duration";
}

function materializeAttemptInput(
  input: Record<string, unknown>,
  task: AITask,
  variant: GenerationAttemptLog["variant"],
): Record<string, unknown> {
  const next = { ...input };
  if ((task === "text_to_video" || task === "image_to_video" || task === "avatar_video") && variant === "rewrite_prompt") {
    const key = task === "avatar_video" ? "script" : "prompt";
    const source = String(next[key] ?? next.prompt ?? "");
    next[key] = `${source}. Cinematic stable camera movement, natural motion, no text, no logos, no watermark, no UI lettering.`;
  }
  if (variant === "fallback_model") {
    delete next.model;
  }
  if ((task === "text_to_video" || task === "image_to_video" || task === "avatar_video") && variant === "lower_duration") {
    const duration = Number(next.duration ?? next.requestedDurationSeconds ?? 5);
    next.duration = Math.max(5, Math.min(duration, 10));
  }
  return next;
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
    const queueStartedAt = Date.now();
    const providers = await resolveProvidersForTask(request.task);
    const provider = providers[0];
    if (!provider) {
      throw new ProviderSelectionError("provider_missing", `No configured provider is available for task "${request.task}"`);
    }
    const selectedCandidate = (await resolveModelCandidatesForTask(request.task)).find((candidate) => candidate.provider === provider);
    const job = await mediaJobManager.createJob(request.task, provider, request.input, request.tenantScope);
    const capturedTask = request.task;
    const capturedTenantScope = request.tenantScope;
    const capturedInput = request.input;

    try {
      await updateGenerationLifecycle({
        jobId: job.id,
        state: "queued",
        tenantId: capturedTenantScope?.tenantId,
        initiatedByUserId: capturedTenantScope?.initiatedByUserId,
        provider,
        model: selectedCandidate?.id,
        task: capturedTask,
        progressPercent: 2,
      });
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
        outputMetadata: {
          resultType: "job_pending",
          provider,
          model: selectedCandidate?.id ?? null,
          routeReason: selectedCandidate?.routeReason ?? null,
          endpointFamily: selectedCandidate?.endpointFamily ?? null,
          source: provider === "genx" ? "app_genx_media_job" : "app_media_job",
        },
      });
    } catch {
      // non-critical
    }

    setTimeout(async () => {
      try {
        await updateGenerationLifecycle({
          jobId: job.id,
          state: "preparing",
          tenantId: capturedTenantScope?.tenantId,
          initiatedByUserId: capturedTenantScope?.initiatedByUserId,
          provider,
          model: selectedCandidate?.id,
          task: capturedTask,
          estimatedCompletionSeconds: 90,
          progressPercent: 8,
        });
        await updateGenerationLifecycle({
          jobId: job.id,
          state: "routing",
          tenantId: capturedTenantScope?.tenantId,
          initiatedByUserId: capturedTenantScope?.initiatedByUserId,
          provider,
          model: selectedCandidate?.id,
          task: capturedTask,
          progressPercent: 15,
        });
        await mediaJobManager.transition(job.id, "generating");
        await updateGenerationLifecycle({
          jobId: job.id,
          state: "generating",
          tenantId: capturedTenantScope?.tenantId,
          initiatedByUserId: capturedTenantScope?.initiatedByUserId,
          provider,
          model: selectedCandidate?.id,
          task: capturedTask,
          progressPercent: 35,
        });
        const maxAttempts = Math.max(1, (request.maxRetries ?? 3) + 1);
        const attempts: GenerationAttemptLog[] = [];
        let result: Awaited<ReturnType<typeof executeWithFallback>> | null = null;
        let persisted: Awaited<ReturnType<typeof persistProviderOutput>> | null = null;
        let providerOutput: Record<string, unknown> = {};
        let lastError: Error | null = null;

        for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
          const variant = buildVariantInput(capturedInput, attemptIndex);
          const attemptInput = materializeAttemptInput(capturedInput, capturedTask, variant);
          if (attemptIndex > 0) {
            await updateGenerationLifecycle({
              jobId: job.id,
              state: "retrying",
              tenantId: capturedTenantScope?.tenantId,
              initiatedByUserId: capturedTenantScope?.initiatedByUserId,
              provider,
              model: selectedCandidate?.id,
              task: capturedTask,
              progressPercent: Math.min(95, 35 + attemptIndex * 10),
              errorMessage: `Retrying with alternate prompt/model (${attemptIndex + 1}/${maxAttempts})`,
            });
          }
          try {
            const nextResult = await executeWithFallback(
              providers,
              capturedTask,
              attemptInput,
              request.timeoutMs ?? taskDef.timeoutMs,
              0,
            );
            const normalised = normalizeProviderOutput({
              output: nextResult.output,
              provider: nextResult.provider,
              model: nextResult.model,
              task: capturedTask,
              latencyMs: nextResult.latencyMs,
            });
            const nextPersisted = await persistProviderOutput({
              normalised,
              output: nextResult.output,
              task: capturedTask,
              jobId: job.id,
            });
            attempts.push({
              attempt: attemptIndex + 1,
              variant,
              provider: nextResult.provider,
              model: nextResult.model,
              prompt: typeof attemptInput.prompt === "string" ? attemptInput.prompt : undefined,
              duration: typeof attemptInput.duration === "number" ? attemptInput.duration : undefined,
              outcome: nextPersisted.resultType === "failed" ? "failed" : "success",
              error: nextPersisted.errorMessage ?? undefined,
            });
            if (nextPersisted.resultType !== "failed") {
              result = nextResult;
              persisted = nextPersisted;
              providerOutput = nextResult.output && typeof nextResult.output === "object"
                ? nextResult.output as Record<string, unknown>
                : {};
              break;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            lastError = error instanceof Error ? error : new Error(message);
            attempts.push({
              attempt: attemptIndex + 1,
              variant,
              prompt: typeof attemptInput.prompt === "string" ? attemptInput.prompt : undefined,
              duration: typeof attemptInput.duration === "number" ? attemptInput.duration : undefined,
              outcome: "failed",
              error: message,
            });
          }
        }

        if (!result || !persisted) {
          throw lastError ?? new Error("All retry attempts failed.");
        }

        await mediaJobManager.transition(job.id, "completed", {
          outputs: {
            ...persisted,
            raw: result.output,
            attempts,
            finalOutcome: persisted.resultType,
          },
        });

        const lifecycleState = persisted.resultType === "job_pending" ? "processing" : "completed";
        await updateGenerationLifecycle({
          jobId: job.id,
          state: lifecycleState,
          tenantId: capturedTenantScope?.tenantId,
          initiatedByUserId: capturedTenantScope?.initiatedByUserId,
          provider: result.provider,
          model: result.model,
          task: capturedTask,
          providerLatencyMs: result.latencyMs,
          progressPercent: lifecycleState === "completed" ? 100 : 72,
          estimatedCompletionSeconds: lifecycleState === "completed" ? 0 : 45,
        });

        try {
          await upsertMediaAssetByJob({
            jobId: job.id,
            task: capturedTask,
            tenantId: capturedTenantScope?.tenantId ?? "global",
            tenantType: capturedTenantScope?.tenantType ?? "individual",
            userId: capturedTenantScope?.initiatedByUserId,
            provider: result.provider,
            status: persisted.resultType === "failed"
              ? "failed"
              : persisted.resultType === "job_pending"
                ? "processing"
                : "completed",
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
              providerStatus: persisted.providerStatus ?? (typeof providerOutput.providerStatus === "string" ? providerOutput.providerStatus : null),
              remoteUrl: persisted.remoteUrl,
              latencyMs: result.latencyMs,
              routeReason: result.routeReason,
              endpointFamily: result.endpointFamily,
              source: persisted.source ?? (result.provider === "genx" ? "app_genx_media_job" : "app_media_job"),
              attempts,
              retryCount: Math.max(0, attempts.length - 1),
              finalOutcome: persisted.resultType,
            },
          });
        } catch {
          // non-critical
        }
        await recordProviderTelemetry({
          provider: result.provider,
          model: result.model,
          task: capturedTask,
          tenantId: capturedTenantScope?.tenantId ?? "global",
          latencyMs: result.latencyMs,
          queueTimeMs: Date.now() - queueStartedAt - result.latencyMs,
          success: persisted.resultType !== "failed",
          retries: Math.max(0, attempts.length - 1),
          cancelled: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await mediaJobManager.transition(job.id, "failed", { error: message });
        await updateGenerationLifecycle({
          jobId: job.id,
          state: "failed",
          tenantId: capturedTenantScope?.tenantId,
          initiatedByUserId: capturedTenantScope?.initiatedByUserId,
          provider,
          model: selectedCandidate?.id,
          task: capturedTask,
          progressPercent: 100,
          errorMessage: message,
        });
        await recordProviderTelemetry({
          provider,
          model: selectedCandidate?.id ?? "unknown",
          task: capturedTask,
          tenantId: capturedTenantScope?.tenantId ?? "global",
          queueTimeMs: Date.now() - queueStartedAt,
          success: false,
          failureReason: message,
          retries: 0,
          cancelled: false,
        });
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
      model: selectedCandidate?.id,
      routeReason: selectedCandidate?.routeReason,
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
    routeReason: result.routeReason,
    moderation: {
      blocked: false,
      reasons: moderation.reasons,
      escalation: moderation.escalation,
    },
  };
}

export async function getAIDiagnostics() {
  const copywritingProviders = await resolveProvidersForTask("copywriting");
  const modelRegistry = await discoverProviderModels();
  const providerCapabilityRegistry = await getProviderCapabilityRegistryRows();
  const effectiveTaskRouting = await getEffectiveTaskRoutingDiagnostics();
  const providerHealth = await getProviderHealth();
  const providerRuntime = getProviderRuntimeDiagnostics();
  const providerRuntimeRows = (providerRuntime as any).providers ?? providerRuntime;
  const analytics = aiUsageAnalytics.getSummary();
  const queueStatus = await getQueueStatus();
  const genxEndpointForProbe = providerHealth.find((provider) => provider.provider === "genx")?.endpoint;
  const genxOriginForProbe = getOriginForProbe(genxEndpointForProbe);
  const outboundNetwork = {
    huggingface: await probeOutboundNetwork("https://huggingface.co"),
    genx: genxOriginForProbe
      ? await probeOutboundNetwork(genxOriginForProbe)
      : { status: "skipped", reason: "GenX base URL missing or invalid" },
  };
  const [mediaJobs, approvals, pendingApprovals, processingJobs] = await Promise.all([
    mediaJobManager.list(),
    aiApprovalQueue.list(),
    aiApprovalQueue.list({ status: "needs_review" }),
    mediaJobManager.list({ state: "processing" }),
  ]);

  let storageStatus: Record<string, unknown> = { root: STORAGE_ROOT, available: false };
  try {
    await ensureStorageDirs();
    const tempPath = await writeTempFile(Buffer.from("marketing-studio-storage-probe"), "txt", "diag");
    await fs.readFile(tempPath);
    await deleteAssetFile(tempPath);
    storageStatus = { root: STORAGE_ROOT, available: true, probe: "write/read/delete" };
  } catch (error) {
    storageStatus = {
      root: STORAGE_ROOT,
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  let socialConnections: Awaited<ReturnType<typeof listSocialConnections>> = [];
  try {
    socialConnections = await listSocialConnections("global");
  } catch {
    socialConnections = [];
  }

  const aiCopyProvider = providerHealth.find((provider) =>
    ["genx", "qwen", "huggingface"].includes(provider.provider) && provider.liveReady,
  );
  const configuredTextProvider = providerHealth.find((provider) =>
    ["genx", "qwen", "huggingface"].includes(provider.provider) && provider.configured,
  );
  const mediaLiveReady = providerHealth.some((provider) =>
    Boolean((provider as any)?.lastMediaSuccessAt && Date.now() - new Date((provider as any).lastMediaSuccessAt).getTime() <= 15 * 60 * 1000),
  );
  const mediaPartial = !mediaLiveReady && Boolean(aiCopyProvider);
  const connectedPlatforms = socialConnections.filter((connection) =>
    ["connected", "approval_required", "ready_to_publish"].includes(connection.state),
  );
  const smtpHost = await getRuntimeConfig("smtp_host", "SMTP_HOST");
  const smtpUser = await getRuntimeConfig("smtp_user", "SMTP_USER");
  const smtpPass = await getRuntimeConfig("smtp_pass", "SMTP_PASS");
  const platformArchitecture = buildPlatformReadiness({
    socialConnections: socialConnections.map((connection) => ({ platform: connection.platform, state: connection.state as any })),
    smtpConfigured: Boolean(smtpHost && smtpUser && smtpPass),
  });

  const taskRegistry = listTaskDefinitions();
  const providerTelemetry = await getProviderTelemetrySummary({ lookbackDays: 30 });
  const rankingPreview = await Promise.all(taskRegistry.slice(0, 8).map(async (task) => ({
    task: task.task,
    ranking: (await rankProvidersForTask(task.task)).providers.slice(0, 3),
  })));
  const taskCapabilities = taskRegistry.map((task) => ({
    task: task.task,
    preferredProvider: task.preferredProvider,
    fallbackProviders: task.fallbackProviders,
    playableMediaCapable: playableTaskSet.has(task.task),
    promptOnly: !playableTaskSet.has(task.task),
  }));
  const genxModels = modelRegistry.providers.genx ?? [];
  const genxMediaDiagnostics = {
    configured: providerHealth.find((provider) => provider.provider === "genx")?.configured ?? false,
    baseUrl: genxEndpointForProbe ?? null,
    discoveredCount: genxModels.length,
    classified: {
      text: genxModels.filter((model) => model.executableTasks.some((task) => ["chat", "copywriting", "strategy", "campaign_generation"].includes(task))).map((model) => model.id),
      image: genxModels.filter((model) => model.executableTasks.some((task) => ["text_to_image", "image_edit"].includes(task))).map((model) => model.id),
      video: genxModels.filter((model) => model.executableTasks.some((task) => ["text_to_video", "image_to_video"].includes(task))).map((model) => model.id),
      avatar: genxModels.filter((model) => model.executableTasks.includes("avatar_video")).map((model) => model.id),
      audio: genxModels.filter((model) => model.executableTasks.includes("text_to_speech")).map((model) => model.id),
      vision: genxModels.filter((model) => model.executableTasks.includes("image_captioning")).map((model) => model.id),
    },
    selected: {
      text: genxModels.find((model) => model.executableTasks.includes("copywriting"))?.id ?? null,
      image: genxModels.find((model) => model.executableTasks.includes("text_to_image"))?.id ?? null,
      video: genxModels.find((model) => model.executableTasks.includes("text_to_video"))?.id ?? null,
      avatar: genxModels.find((model) => model.executableTasks.includes("avatar_video"))?.id ?? null,
    },
    lastMediaAttempt: mediaJobs.find((job) => job.provider === "genx") ?? null,
    lastMediaError: providerRuntimeRows.genx?.lastError ?? null,
    playableMediaProduced: Boolean(providerRuntimeRows.genx?.lastMediaSuccessAt),
  };

  return {
    providerHealth,
    providerRuntime,
    usage: analytics.providerUsage,
    taskStats: analytics.taskCounts,
    recentFailures: analytics.recentFailures,
    recentUsage: analytics.recentUsage,
    queueStatus,
    modelRegistry,
    providerTelemetry,
    providerRanking: rankingPreview,
    providerCapabilityRegistry,
    effectiveTaskRouting,
    genxMediaDiagnostics,
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
    socialConnections,
    platformArchitecture,
    outboundNetwork,
    readiness: {
      aiCopy: {
        state: aiCopyProvider ? "ready" : configuredTextProvider ? "warning" : "missing",
        label: aiCopyProvider
          ? "AI ready"
          : configuredTextProvider
            ? "AI setup required"
            : "AI setup required",
        provider: aiCopyProvider?.provider ?? configuredTextProvider?.provider ?? null,
        message: aiCopyProvider?.message ?? configuredTextProvider?.message ?? "Add GenX base URL/key/model or another text provider, then run provider test.",
      },
      media: {
        state: mediaLiveReady ? "ready" : mediaPartial ? "partial" : "missing",
        label: mediaLiveReady
          ? "Media ready"
          : mediaPartial
            ? "Media setup required"
            : "Media setup required",
        message: mediaLiveReady
          ? "Playable media provider test passed recently."
          : mediaPartial
            ? "Prompt/script generation works. Playable image/video requires a configured media provider."
            : "No media provider has passed a live image/video test.",
      },
      storage: {
        state: storageStatus.available ? "ready" : "warning",
        label: storageStatus.available ? "Storage ready" : "Storage check failed",
        message: storageStatus.available ? "Write/read/delete probe passed." : String(storageStatus.error ?? "Storage probe failed."),
      },
      platforms: {
        state: connectedPlatforms.length > 0 ? "ready" : "missing",
        label: connectedPlatforms.length > 0 ? `${connectedPlatforms.length}/${socialConnections.length || 7} platforms connected` : "Platforms setup needed",
        connected: connectedPlatforms.length,
        total: socialConnections.length || 7,
        message: connectedPlatforms.length > 0
          ? "At least one platform connection exists."
          : "Connection flow required before direct publishing. Content prep, previews and approval scheduling remain available.",
      },
    },
    limits: {
      maxJobsPerDay: 250,
      maxVideosPerDay: 50,
      maxAvatarJobsPerDay: 20,
    },
  };
}
