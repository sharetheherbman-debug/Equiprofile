import type { AIProviderName, AITask } from "./types";
import { resolveModelCandidatesForTask } from "./modelRegistry";
import { getProviderTelemetrySummary } from "./providerTelemetry";
import { getProviderHealth } from "./providers/providerRegistry";

export type ProviderRankingResult = {
  task: AITask;
  providers: Array<{
    provider: AIProviderName;
    score: number;
    model: string | null;
    reasons: string[];
    queueBacklog: number;
    available: boolean;
  }>;
};

function durationSupportFor(provider: AIProviderName, task: AITask): number {
  if (task !== "text_to_video" && task !== "image_to_video" && task !== "avatar_video") return 60;
  if (provider === "genx") return 10;
  if (provider === "huggingface") return 10;
  if (provider === "qwen") return 10;
  return 10;
}

export function getProviderDurationSupport(provider: AIProviderName, task: AITask) {
  return {
    maxDurationSeconds: durationSupportFor(provider, task),
    supportedDurations: [5, 10],
  };
}

export async function rankProvidersForTask(task: AITask, options: { tenantId?: string; queueBacklog?: Record<AIProviderName, number> } = {}): Promise<ProviderRankingResult> {
  const candidates = await resolveModelCandidatesForTask(task);
  const providers = Array.from(new Set(candidates.map((candidate) => candidate.provider)));
  const [health, telemetry] = await Promise.all([
    getProviderHealth(),
    getProviderTelemetrySummary({ task, tenantId: options.tenantId, lookbackDays: 30 }),
  ]);

  const scoreRows = providers.map((provider) => {
    const providerCandidates = candidates.filter((candidate) => candidate.provider === provider);
    const bestModel = providerCandidates[0]?.id ?? null;
    const healthRow = health.find((item) => item.provider === provider);
    const telemetryRow = telemetry.find((item) => item.provider === provider);
    const queueBacklog = options.queueBacklog?.[provider] ?? 0;

    const successRate = telemetryRow?.successRate ?? 0.5;
    const failureRate = telemetryRow?.failureRate ?? 0.5;
    const avgCompletionTimeMs = telemetryRow?.avgCompletionTimeMs ?? 90_000;
    const availabilityScore = healthRow?.liveReady ? 1 : healthRow?.configured ? 0.6 : 0;
    const queueScore = Math.max(0, 1 - Math.min(queueBacklog / 20, 1));
    const speedScore = Math.max(0, 1 - Math.min(avgCompletionTimeMs / 180_000, 1));

    const score =
      successRate * 0.36 +
      (1 - failureRate) * 0.2 +
      speedScore * 0.16 +
      availabilityScore * 0.16 +
      queueScore * 0.12;

    const reasons = [
      `success_rate=${(successRate * 100).toFixed(0)}%`,
      `failure_rate=${(failureRate * 100).toFixed(0)}%`,
      `avg_completion_ms=${Math.round(avgCompletionTimeMs)}`,
      `availability=${availabilityScore}`,
      `queue_backlog=${queueBacklog}`,
    ];

    return {
      provider,
      score,
      model: bestModel,
      reasons,
      queueBacklog,
      available: providerCandidates.length > 0,
    };
  });

  scoreRows.sort((a, b) => b.score - a.score);
  return { task, providers: scoreRows };
}
