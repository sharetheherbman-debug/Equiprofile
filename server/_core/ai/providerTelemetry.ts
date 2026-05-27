import { and, desc, eq, gte } from "drizzle-orm";
import { growthAnalyticsEvents } from "../../../drizzle/schema";
import type { AIProviderName, AITask } from "./types";
import { getRuntimeConfigMode } from "../../dynamicConfig";

export type ProviderTelemetryEvent = {
  provider: AIProviderName;
  model: string;
  task: AITask;
  tenantId: string;
  latencyMs?: number;
  queueTimeMs?: number;
  mediaDurationSeconds?: number;
  generationSizeBytes?: number;
  retries?: number;
  cancelled?: boolean;
  success: boolean;
  failureReason?: string;
};

export type ProviderTelemetrySummary = {
  provider: AIProviderName;
  task?: AITask;
  totalRuns: number;
  successRate: number;
  failureRate: number;
  cancellationRate: number;
  retries: number;
  avgLatencyMs: number;
  avgQueueTimeMs: number;
  avgCompletionTimeMs: number;
  avgMediaDurationSeconds: number;
  avgGenerationSizeBytes: number;
};

async function resolveDb() {
  const dbModule = await import("../../db");
  if ("getDb" in dbModule && typeof dbModule.getDb === "function") return dbModule.getDb();
  return null;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function recordProviderTelemetry(event: ProviderTelemetryEvent): Promise<void> {
  if (getRuntimeConfigMode() === "unit_test_mock") return;
  const db = await resolveDb();
  if (!db) return;

  try {
    await db.insert(growthAnalyticsEvents).values({
      tenantId: event.tenantId,
      actorUserId: null,
      eventType: "provider_execution",
      stage: `ai_provider_${event.provider}`,
      source: event.provider,
      metadataJson: JSON.stringify({
        provider: event.provider,
        model: event.model,
        task: event.task,
        latencyMs: event.latencyMs ?? null,
        queueTimeMs: event.queueTimeMs ?? null,
        mediaDurationSeconds: event.mediaDurationSeconds ?? null,
        generationSizeBytes: event.generationSizeBytes ?? null,
        retries: event.retries ?? 0,
        cancelled: Boolean(event.cancelled),
        success: event.success,
        failureReason: event.failureReason ?? null,
        completionTimeMs: (event.latencyMs ?? 0) + (event.queueTimeMs ?? 0),
      }),
    });
  } catch {
    // telemetry persistence should not block task execution
  }
}

export async function getProviderTelemetrySummary(input: {
  provider?: AIProviderName;
  task?: AITask;
  tenantId?: string;
  lookbackDays?: number;
} = {}): Promise<ProviderTelemetrySummary[]> {
  if (getRuntimeConfigMode() === "unit_test_mock") return [];
  const db = await resolveDb();
  if (!db) return [];

  const lookbackDays = input.lookbackDays ?? 14;
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const conditions = [
    eq(growthAnalyticsEvents.eventType, "provider_execution"),
    gte(growthAnalyticsEvents.createdAt, since),
  ];

  if (input.provider) conditions.push(eq(growthAnalyticsEvents.source, input.provider));
  if (input.tenantId) conditions.push(eq(growthAnalyticsEvents.tenantId, input.tenantId));

  let rows: typeof growthAnalyticsEvents.$inferSelect[] = [];
  try {
    rows = await db
      .select()
      .from(growthAnalyticsEvents)
      .where(and(...conditions))
      .orderBy(desc(growthAnalyticsEvents.createdAt))
      .limit(2000);
  } catch {
    return [];
  }

  const groups = new Map<string, {
    provider: AIProviderName;
    task?: AITask;
    totalRuns: number;
    success: number;
    failed: number;
    cancelled: number;
    retries: number;
    latencySum: number;
    queueSum: number;
    completionSum: number;
    mediaDurationSum: number;
    generationSizeSum: number;
    mediaDurationCount: number;
    generationSizeCount: number;
  }>();

  for (const row of rows) {
    const meta = parseJson<Record<string, unknown>>(row.metadataJson, {});
    const provider = String(meta.provider ?? row.source ?? "genx") as AIProviderName;
    const task = typeof meta.task === "string" ? (meta.task as AITask) : undefined;
    if (input.task && task !== input.task) continue;

    const key = `${provider}:${task ?? "*"}`;
    const bucket = groups.get(key) ?? {
      provider,
      task,
      totalRuns: 0,
      success: 0,
      failed: 0,
      cancelled: 0,
      retries: 0,
      latencySum: 0,
      queueSum: 0,
      completionSum: 0,
      mediaDurationSum: 0,
      generationSizeSum: 0,
      mediaDurationCount: 0,
      generationSizeCount: 0,
    };

    bucket.totalRuns += 1;
    const succeeded = meta.success === true;
    if (succeeded) bucket.success += 1;
    else bucket.failed += 1;
    if (meta.cancelled === true) bucket.cancelled += 1;

    const retries = Number(meta.retries ?? 0);
    if (Number.isFinite(retries)) bucket.retries += retries;

    const latency = Number(meta.latencyMs ?? 0);
    const queue = Number(meta.queueTimeMs ?? 0);
    const completion = Number(meta.completionTimeMs ?? latency + queue);
    if (Number.isFinite(latency)) bucket.latencySum += latency;
    if (Number.isFinite(queue)) bucket.queueSum += queue;
    if (Number.isFinite(completion)) bucket.completionSum += completion;

    const mediaDuration = Number(meta.mediaDurationSeconds ?? NaN);
    if (Number.isFinite(mediaDuration)) {
      bucket.mediaDurationSum += mediaDuration;
      bucket.mediaDurationCount += 1;
    }

    const generationSize = Number(meta.generationSizeBytes ?? NaN);
    if (Number.isFinite(generationSize)) {
      bucket.generationSizeSum += generationSize;
      bucket.generationSizeCount += 1;
    }

    groups.set(key, bucket);
  }

  return Array.from(groups.values()).map((bucket) => ({
    provider: bucket.provider,
    task: bucket.task,
    totalRuns: bucket.totalRuns,
    successRate: bucket.totalRuns ? bucket.success / bucket.totalRuns : 0,
    failureRate: bucket.totalRuns ? bucket.failed / bucket.totalRuns : 0,
    cancellationRate: bucket.totalRuns ? bucket.cancelled / bucket.totalRuns : 0,
    retries: bucket.retries,
    avgLatencyMs: bucket.totalRuns ? Math.round(bucket.latencySum / bucket.totalRuns) : 0,
    avgQueueTimeMs: bucket.totalRuns ? Math.round(bucket.queueSum / bucket.totalRuns) : 0,
    avgCompletionTimeMs: bucket.totalRuns ? Math.round(bucket.completionSum / bucket.totalRuns) : 0,
    avgMediaDurationSeconds: bucket.mediaDurationCount ? Math.round(bucket.mediaDurationSum / bucket.mediaDurationCount) : 0,
    avgGenerationSizeBytes: bucket.generationSizeCount ? Math.round(bucket.generationSizeSum / bucket.generationSizeCount) : 0,
  }));
}
