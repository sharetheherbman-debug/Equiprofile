import { and, eq } from "drizzle-orm";
import { growthQueueJobs } from "../../../drizzle/schema";
import { publishModuleEvent } from "../realtime";
import type { MediaJobState } from "./types";

export const GENERATION_LIFECYCLE_STATES = [
  "queued",
  "preparing",
  "routing",
  "generating",
  "rendering",
  "processing",
  "downloading",
  "storing",
  "completed",
  "failed",
  "cancelled",
  "retrying",
] as const;

export type GenerationLifecycleState = (typeof GENERATION_LIFECYCLE_STATES)[number];

export type GenerationLifecycleSnapshot = {
  jobId: string;
  state: GenerationLifecycleState;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  estimatedCompletionSeconds?: number;
  progressPercent?: number;
  providerLatencyMs?: number;
  queuePosition?: number;
  provider?: string;
  model?: string;
  task?: string;
  assetId?: number;
  errorMessage?: string;
};

type UpdateLifecycleInput = {
  jobId: string;
  state: GenerationLifecycleState;
  tenantId?: string;
  initiatedByUserId?: number;
  provider?: string;
  model?: string;
  task?: string;
  assetId?: number;
  errorMessage?: string;
  estimatedCompletionSeconds?: number;
  progressPercent?: number;
  providerLatencyMs?: number;
  queuePosition?: number;
};

const ALLOWED_TRANSITIONS: Record<GenerationLifecycleState, GenerationLifecycleState[]> = {
  queued: ["preparing", "routing", "retrying", "cancelled", "failed"],
  preparing: ["routing", "generating", "cancelled", "failed", "retrying"],
  routing: ["generating", "retrying", "cancelled", "failed"],
  generating: ["rendering", "processing", "downloading", "storing", "completed", "failed", "retrying", "cancelled"],
  rendering: ["processing", "downloading", "storing", "completed", "failed", "retrying", "cancelled"],
  processing: ["downloading", "storing", "rendering", "completed", "failed", "retrying", "cancelled"],
  downloading: ["storing", "completed", "failed", "retrying", "cancelled"],
  storing: ["completed", "failed", "retrying", "cancelled"],
  retrying: ["queued", "preparing", "routing", "generating", "failed", "cancelled"],
  completed: [],
  failed: ["retrying"],
  cancelled: ["retrying"],
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function clampProgress(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isTerminal(state: GenerationLifecycleState) {
  return state === "completed" || state === "failed" || state === "cancelled";
}

function asMediaState(state: GenerationLifecycleState): MediaJobState {
  return state;
}

export function mapLifecycleToStudioStatus(state: GenerationLifecycleState):
  | "queued"
  | "preparing"
  | "routing"
  | "generating"
  | "rendering"
  | "processing"
  | "downloading"
  | "storing"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying" {
  return state;
}

async function resolveDb() {
  const dbModule = await import("../../db");
  if ("getDb" in dbModule && typeof dbModule.getDb === "function") return dbModule.getDb();
  return null;
}

async function patchMediaAssetLifecycle(snapshot: GenerationLifecycleSnapshot) {
  const mediaAssets = await import("../../modules/growth-engine/mediaAssets");
  const asset = snapshot.assetId
    ? await mediaAssets.getMediaAssetById(snapshot.assetId)
    : await mediaAssets.getMediaAssetByJobId(snapshot.jobId);
  if (!asset) return;

  await mediaAssets.updateMediaAsset(asset.id, {
    status: snapshot.state === "completed"
      ? "completed"
      : snapshot.state === "failed" || snapshot.state === "cancelled"
        ? "failed"
        : "processing",
    ...(snapshot.errorMessage ? { errorMessage: snapshot.errorMessage } : {}),
    outputMetadata: {
      ...(asset.outputMetadata ?? {}),
      lifecycle: snapshot,
      resultType:
        snapshot.state === "failed" || snapshot.state === "cancelled"
          ? "failed"
          : (asset.outputMetadata?.resultType ?? "job_pending"),
    },
  });
}

export async function getGenerationLifecycleByJobId(jobId: string): Promise<GenerationLifecycleSnapshot | null> {
  const db = await resolveDb();
  if (!db) return null;
  const idNum = Number(jobId);
  if (!Number.isFinite(idNum)) return null;

  const [row] = await db
    .select()
    .from(growthQueueJobs)
    .where(and(eq(growthQueueJobs.id, idNum), eq(growthQueueJobs.queueType, "media")))
    .limit(1);

  if (!row) return null;
  const metadata = parseJson<Record<string, unknown>>(row.metadataJson, {});
  const lifecycle = (metadata.lifecycle ?? {}) as Partial<GenerationLifecycleSnapshot>;

  const fallbackStartedAt = row.createdAt.toISOString();
  const fallbackUpdatedAt = row.updatedAt.toISOString();

  return {
    jobId: String(row.id),
    state: (lifecycle.state as GenerationLifecycleState) ?? ((row.status as GenerationLifecycleState) || "queued"),
    startedAt: lifecycle.startedAt ?? fallbackStartedAt,
    updatedAt: lifecycle.updatedAt ?? fallbackUpdatedAt,
    completedAt: lifecycle.completedAt,
    failedAt: lifecycle.failedAt,
    estimatedCompletionSeconds: typeof lifecycle.estimatedCompletionSeconds === "number" ? lifecycle.estimatedCompletionSeconds : undefined,
    progressPercent: typeof lifecycle.progressPercent === "number" ? lifecycle.progressPercent : undefined,
    providerLatencyMs: typeof lifecycle.providerLatencyMs === "number" ? lifecycle.providerLatencyMs : undefined,
    queuePosition: typeof lifecycle.queuePosition === "number" ? lifecycle.queuePosition : undefined,
    provider: typeof lifecycle.provider === "string" ? lifecycle.provider : row.provider ?? undefined,
    model: typeof lifecycle.model === "string" ? lifecycle.model : undefined,
    task: typeof lifecycle.task === "string" ? lifecycle.task : row.task ?? undefined,
    assetId: typeof lifecycle.assetId === "number" ? lifecycle.assetId : undefined,
    errorMessage: typeof lifecycle.errorMessage === "string" ? lifecycle.errorMessage : row.errorMessage ?? undefined,
  };
}

export async function updateGenerationLifecycle(input: UpdateLifecycleInput): Promise<GenerationLifecycleSnapshot> {
  const db = await resolveDb();
  if (!db) {
    throw new Error("Database is required for generation lifecycle updates");
  }

  const idNum = Number(input.jobId);
  if (!Number.isFinite(idNum)) {
    throw new Error(`Invalid media job id: ${input.jobId}`);
  }

  const [row] = await db
    .select()
    .from(growthQueueJobs)
    .where(and(eq(growthQueueJobs.id, idNum), eq(growthQueueJobs.queueType, "media")))
    .limit(1);

  if (!row) {
    throw new Error(`Media job not found: ${input.jobId}`);
  }

  const now = new Date().toISOString();
  const metadata = parseJson<Record<string, unknown>>(row.metadataJson, {});
  const current = (metadata.lifecycle ?? {}) as Partial<GenerationLifecycleSnapshot>;
  const previousState = (current.state as GenerationLifecycleState) ?? ((row.status as GenerationLifecycleState) || "queued");

  if (previousState !== input.state && !ALLOWED_TRANSITIONS[previousState]?.includes(input.state)) {
    throw new Error(`Invalid lifecycle transition ${previousState} -> ${input.state}`);
  }

  const snapshot: GenerationLifecycleSnapshot = {
    jobId: String(row.id),
    state: input.state,
    startedAt: current.startedAt ?? row.createdAt.toISOString(),
    updatedAt: now,
    completedAt: input.state === "completed" ? now : current.completedAt,
    failedAt: input.state === "failed" ? now : current.failedAt,
    estimatedCompletionSeconds: input.estimatedCompletionSeconds ?? current.estimatedCompletionSeconds,
    progressPercent: clampProgress(input.progressPercent ?? current.progressPercent),
    providerLatencyMs: input.providerLatencyMs ?? current.providerLatencyMs,
    queuePosition: input.queuePosition ?? current.queuePosition,
    provider: input.provider ?? current.provider ?? row.provider ?? undefined,
    model: input.model ?? current.model,
    task: input.task ?? current.task ?? row.task ?? undefined,
    assetId: input.assetId ?? current.assetId,
    errorMessage: input.errorMessage ?? current.errorMessage,
  };

  if (isTerminal(input.state) && !snapshot.completedAt && input.state !== "failed") {
    snapshot.completedAt = now;
  }

  await db
    .update(growthQueueJobs)
    .set({
      status: asMediaState(input.state),
      metadataJson: JSON.stringify({ ...metadata, lifecycle: snapshot }),
      errorMessage: input.errorMessage ?? row.errorMessage,
      completedAt: isTerminal(input.state) ? new Date(now) : row.completedAt,
      updatedAt: new Date(now),
    })
    .where(eq(growthQueueJobs.id, idNum));

  try {
    await patchMediaAssetLifecycle(snapshot);
  } catch {
    // non-critical
  }

  if (input.initiatedByUserId) {
    publishModuleEvent("generation", "updated", snapshot, input.initiatedByUserId);
  }

  return snapshot;
}
