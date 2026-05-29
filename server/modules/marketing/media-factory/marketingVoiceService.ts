import { executeAITask } from "../../../_core/ai/orchestrator";
import { resolveModelCandidatesForTask } from "../../../_core/ai/modelRegistry";
import { rankProvidersForTask } from "../../../_core/ai/providerRanking";
import type { AIProviderName } from "../../../_core/ai/types";
import { createMediaAsset, getMediaAssetByJobId } from "../../growth-engine";
import type { MarketingStudioPlan } from "../../../../shared/_core/marketingStudioPlan";

type VoiceoverResult =
  | {
    status: "setup_needed";
    reason: string;
    provider: AIProviderName | null;
    model: string | null;
    voiceAssetId: number | null;
    audioUrl: string | null;
  }
  | {
    status: "queued" | "completed" | "failed";
    provider: AIProviderName;
    model: string | null;
    voiceAssetId: number | null;
    audioUrl: string | null;
    jobId: string | null;
  };

function normalizeVoiceScript(plan: Pick<MarketingStudioPlan, "script" | "scenes" | "voiceoverScript">): string {
  const inline = String(plan.voiceoverScript ?? "").trim();
  if (inline) return inline;
  const script = String(plan.script ?? "").trim();
  if (script) return script;
  return plan.scenes
    .map((scene) => String(scene.narration ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

async function resolveVoiceProvider(preference?: string): Promise<{ provider: AIProviderName | null; model: string | null }> {
  const candidates = await resolveModelCandidatesForTask("text_to_speech");
  if (!candidates.length) {
    return { provider: null, model: null };
  }

  if (preference) {
    const preferred = candidates.find((candidate) => candidate.provider === preference);
    if (preferred) return { provider: preferred.provider, model: preferred.id };
  }

  const ranked = await rankProvidersForTask("text_to_speech");
  const available = ranked.providers.find((provider) => provider.available && provider.model);
  if (available?.provider) {
    return { provider: available.provider, model: available.model };
  }

  return { provider: candidates[0]?.provider ?? null, model: candidates[0]?.id ?? null };
}

export async function createMarketingVoiceover(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  plan: Pick<MarketingStudioPlan, "id" | "script" | "scenes" | "voiceoverScript">;
  voiceId?: string | null;
  providerPreference?: string | null;
  userId?: number;
}): Promise<VoiceoverResult> {
  const script = normalizeVoiceScript(input.plan);
  if (!script) {
    return {
      status: "setup_needed",
      reason: "voiceover_script_missing",
      provider: null,
      model: null,
      voiceAssetId: null,
      audioUrl: null,
    };
  }

  if (!input.voiceId) {
    return {
      status: "setup_needed",
      reason: "voice_id_required",
      provider: null,
      model: null,
      voiceAssetId: null,
      audioUrl: null,
    };
  }

  const providerSelection = await resolveVoiceProvider(input.providerPreference ?? undefined);
  if (!providerSelection.provider) {
    return {
      status: "setup_needed",
      reason: "voice_provider_unavailable",
      provider: null,
      model: null,
      voiceAssetId: null,
      audioUrl: null,
    };
  }

  try {
    const execution = await executeAITask({
      task: "text_to_speech",
      agentId: "MediaAgent",
      requiresApproval: false,
      input: {
        prompt: script,
        text: script,
        voiceId: input.voiceId,
        providerPreference: providerSelection.provider,
        workspaceId: input.workspaceId,
        hostAppId: input.hostAppId,
        planId: input.plan.id,
      },
    });

    const resolvedProvider = execution.provider ?? providerSelection.provider;
    const resolvedModel = execution.model ?? providerSelection.model;
    const voiceAsset = execution.jobId ? await getMediaAssetByJobId(execution.jobId).catch(() => null) : null;
    const hasAudio = Boolean(voiceAsset?.publicUrl || voiceAsset?.localPath);

    if (execution.status === "completed" && !hasAudio) {
      return {
        status: "setup_needed",
        reason: "provider_returned_no_audio",
        provider: resolvedProvider,
        model: resolvedModel ?? null,
        voiceAssetId: null,
        audioUrl: null,
      };
    }

    if (execution.status === "needs_review") {
      return {
        status: "failed",
        provider: resolvedProvider,
        model: resolvedModel ?? null,
        voiceAssetId: voiceAsset?.id ?? null,
        audioUrl: voiceAsset?.publicUrl ?? null,
        jobId: execution.jobId ?? null,
      };
    }

    return {
      status: execution.status === "queued" ? "queued" : "completed",
      provider: resolvedProvider,
      model: resolvedModel ?? null,
      voiceAssetId: voiceAsset?.id ?? null,
      audioUrl: voiceAsset?.publicUrl ?? null,
      jobId: execution.jobId ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const setupAsset = await createMediaAsset({
      tenantId: input.tenantId,
      userId: input.userId,
      type: "voice",
      provider: providerSelection.provider,
      task: "text_to_speech",
      status: "failed",
      generationPrompt: script,
      outputMetadata: {
        resultType: "setup_needed",
        setupReason: "voice_provider_failed",
        provider: providerSelection.provider,
        model: providerSelection.model,
        voiceId: input.voiceId,
        planId: input.plan.id,
      },
      errorMessage: message,
    });
    return {
      status: "setup_needed",
      reason: "voice_provider_failed",
      provider: providerSelection.provider,
      model: providerSelection.model,
      voiceAssetId: setupAsset.id,
      audioUrl: null,
    };
  }
}

export function buildMarketingVoiceoverScript(plan: Pick<MarketingStudioPlan, "script" | "scenes" | "voiceoverScript">): string {
  return normalizeVoiceScript(plan);
}
