// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// Media Resolver - polls pending GenX jobs and resolves them into playable assets.

import { listPendingMediaAssets, updateMediaAsset } from "../../modules/growth-engine/mediaAssets";
import { pollGenXMediaJob, resolveGenXConfig } from "./providers/genxProvider";
import { buildEndpoint } from "./providers/httpUtils";
import { persistProviderOutput, normalizeProviderOutput } from "./outputNormalization";
import { writeGeneratedAsset, type MediaFolder } from "../storage/localMediaStorage";
import type { AITask } from "./types";

const MEDIA_TASKS: AITask[] = ["text_to_image", "image_edit", "text_to_video", "image_to_video", "avatar_video", "text_to_speech"];
const TEXT_PLAN_ERROR = "Provider returned text/plain planning output, not playable media.";

function taskFromString(s: string | null | undefined): AITask {
  if (s && (MEDIA_TASKS as string[]).includes(s)) return s as AITask;
  return "text_to_video";
}

function stripV1Suffix(baseUrl: string): string {
  return baseUrl.replace(/\/v1$/i, "").replace(/\/+$/, "");
}

function firstString(payload: any, paths: string[][]): string | null {
  for (const path of paths) {
    let current = payload;
    for (const key of path) current = Array.isArray(current) ? current[Number(key)] : current?.[key];
    if (typeof current === "string" && current.trim()) return current.trim();
  }
  return null;
}

function folderForMime(mimeType: string): MediaFolder {
  if (mimeType.startsWith("video/")) return "videos";
  if (mimeType.startsWith("image/")) return "images";
  if (mimeType.startsWith("audio/")) return "voice";
  return "generated";
}

function extForMime(mimeType: string) {
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/webm") return "webm";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "audio/mpeg") return "mp3";
  if (mimeType === "audio/wav") return "wav";
  return undefined;
}

function isPlayableMime(mimeType: string) {
  return mimeType.startsWith("video/") || mimeType.startsWith("image/") || mimeType.startsWith("audio/");
}

async function fetchWithToken(url: string, token: string) {
  return fetch(url, { method: "GET", headers: { authorization: `Bearer ${token}` } });
}

export type ResolverResult = {
  assetId: number;
  status: "completed" | "processing" | "failed" | "skipped";
  publicUrl?: string;
  mimeType?: string;
  providerJobId?: string;
  message: string;
};

export type ResolveMediaJobsOutput = {
  resolved: number;
  completed: number;
  processing: number;
  failed: number;
  results: ResolverResult[];
};

type PendingAsset = Awaited<ReturnType<typeof listPendingMediaAssets>>[number];

function metadataWith(asset: PendingAsset, patch: Record<string, unknown>) {
  return {
    ...(asset.outputMetadata ?? {}),
    ...patch,
    resolvedAt: new Date().toISOString(),
  };
}

async function failAsset(asset: PendingAsset, errorMessage: string, metadata: Record<string, unknown>): Promise<ResolverResult> {
  await updateMediaAsset(asset.id, {
    status: "failed",
    errorMessage,
    mimeType: typeof metadata.mimeType === "string" ? metadata.mimeType : undefined,
    outputMetadata: metadataWith(asset, metadata),
  });
  return {
    assetId: asset.id,
    status: "failed",
    providerJobId: typeof metadata.providerJobId === "string" ? metadata.providerJobId : undefined,
    message: errorMessage,
  };
}

async function persistPlayableFile(asset: PendingAsset, providerJobId: string, data: Buffer, mimeType: string, remoteUrl?: string): Promise<ResolverResult> {
  const stored = await writeGeneratedAsset({
    data,
    folder: folderForMime(mimeType),
    mimeType,
    jobId: asset.jobId ?? providerJobId,
    ext: extForMime(mimeType),
  });
  await updateMediaAsset(asset.id, {
    status: "completed",
    localPath: stored.localPath,
    publicUrl: stored.publicUrl,
    mimeType,
    fileSizeBytes: stored.fileSizeBytes,
    errorMessage: null,
    outputMetadata: metadataWith(asset, {
      resultType: "file",
      providerJobId,
      providerStatus: "completed",
      remoteUrl: remoteUrl ?? null,
      source: "app_genx_media_job",
    }),
  });
  return {
    assetId: asset.id,
    status: "completed",
    publicUrl: stored.publicUrl,
    mimeType,
    providerJobId,
    message: `Resolved: ${stored.publicUrl}`,
  };
}

async function resolveCompletedGenXFile(asset: PendingAsset, providerJobId: string): Promise<ResolverResult | null> {
  const { key, base } = await resolveGenXConfig(taskFromString(asset.task));
  if (!key || !base) {
    return failAsset(asset, "GenX not configured; cannot resolve media job.", {
      resultType: "failed",
      providerJobId,
      providerStatus: "failed",
      source: "app_genx_media_job",
    });
  }

  const root = stripV1Suffix(base);
  const statusEndpoint = buildEndpoint(root, `/api/v1/jobs/${encodeURIComponent(providerJobId)}`);
  const statusResponse = await fetchWithToken(statusEndpoint, key);
  const statusContentType = statusResponse.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
  if (!statusResponse.ok) {
    return failAsset(asset, `GenX job status failed: HTTP ${statusResponse.status}`, {
      resultType: "failed",
      providerJobId,
      providerStatus: "failed",
      statusCode: statusResponse.status,
      source: "app_genx_media_job",
    });
  }
  if (isPlayableMime(statusContentType)) {
    return persistPlayableFile(asset, providerJobId, Buffer.from(await statusResponse.arrayBuffer()), statusContentType, statusEndpoint);
  }

  const payload = await statusResponse.json().catch(async () => ({ text: await statusResponse.text().catch(() => "") })) as Record<string, any>;
  const providerStatus = firstString(payload, [["status"], ["state"], ["providerStatus"], ["result", "status"]]) ?? "unknown";
  if (/failed|error|cancel/i.test(providerStatus)) {
    const error = firstString(payload, [["error"], ["message"], ["detail"], ["result", "error"]]) ?? "Provider reported failure.";
    return failAsset(asset, error, {
      resultType: "failed",
      providerJobId,
      providerStatus: "failed",
      source: "app_genx_media_job",
    });
  }
  if (!/completed|succeeded|success|done/i.test(providerStatus)) {
    await updateMediaAsset(asset.id, {
      status: "processing",
      outputMetadata: {
        ...(asset.outputMetadata ?? {}),
        resultType: "job_pending",
        providerJobId,
        providerStatus,
        source: "app_genx_media_job",
      },
    });
    return { assetId: asset.id, status: "processing", providerJobId, message: `Still pending (${providerStatus}).` };
  }

  const resultUrl = firstString(payload, [
    ["result_url"],
    ["resultUrl"],
    ["url"],
    ["output_url"],
    ["outputUrl"],
    ["result", "result_url"],
    ["result", "url"],
    ["output", "url"],
  ]);

  if (resultUrl?.startsWith("data:text/plain")) {
    return failAsset(asset, TEXT_PLAN_ERROR, {
      resultType: "video_plan",
      providerJobId,
      providerStatus: "completed",
      mimeType: "text/plain",
      source: "app_genx_media_job",
    });
  }
  if (!resultUrl) {
    return failAsset(asset, "GenX completed without a playable result_url.", {
      resultType: "failed",
      providerJobId,
      providerStatus: "completed",
      source: "app_genx_media_job",
    });
  }

  const fileUrl = resultUrl.startsWith("http")
    ? resultUrl
    : buildEndpoint(root, resultUrl.startsWith("/") ? resultUrl : `/${resultUrl}`);
  const fileResponse = await fetchWithToken(fileUrl, key);
  const fileMime = fileResponse.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
  if (!fileResponse.ok) {
    return failAsset(asset, `GenX completed file fetch failed: HTTP ${fileResponse.status}`, {
      resultType: "failed",
      providerJobId,
      providerStatus: "completed",
      remoteUrl: fileUrl,
      source: "app_genx_media_job",
    });
  }
  if (fileMime === "text/plain") {
    return failAsset(asset, TEXT_PLAN_ERROR, {
      resultType: "video_plan",
      providerJobId,
      providerStatus: "completed",
      mimeType: "text/plain",
      remoteUrl: fileUrl,
      source: "app_genx_media_job",
    });
  }
  if (!isPlayableMime(fileMime)) {
    return failAsset(asset, `GenX completed file is not playable media (${fileMime || "unknown content-type"}).`, {
      resultType: "failed",
      providerJobId,
      providerStatus: "completed",
      mimeType: fileMime || null,
      remoteUrl: fileUrl,
      source: "app_genx_media_job",
    });
  }

  return persistPlayableFile(asset, providerJobId, Buffer.from(await fileResponse.arrayBuffer()), fileMime, fileUrl);
}

async function resolveOneAsset(asset: PendingAsset): Promise<ResolverResult> {
  const meta = asset.outputMetadata ?? {};
  const providerJobId =
    typeof meta.providerJobId === "string" && meta.providerJobId.trim()
      ? meta.providerJobId.trim()
      : null;

  if (!providerJobId) {
    return {
      assetId: asset.id,
      status: "skipped",
      message: "No providerJobId in outputMetadata - cannot poll.",
    };
  }

  const task = taskFromString(asset.task);
  const direct = await resolveCompletedGenXFile(asset, providerJobId);
  if (direct) return direct;

  const poll = await pollGenXMediaJob(providerJobId, task, 15_000);
  if (poll.status === "failed") {
    return failAsset(asset, poll.error ?? "Provider reported job failure.", {
      ...meta,
      resultType: "failed",
      providerJobId,
      providerStatus: "failed",
    });
  }
  if (poll.status !== "resolved") {
    return { assetId: asset.id, status: "processing", providerJobId, message: poll.diagnostics };
  }

  const normalised = normalizeProviderOutput({
    output: {
      result_url: poll.url ?? undefined,
      base64: poll.base64 ?? undefined,
      mimeType: poll.mimeType ?? undefined,
      providerJobId,
      status: "completed",
      source: "app_genx_media_job",
    },
    provider: "genx",
    model: typeof meta.model === "string" && meta.model.trim() ? meta.model.trim() : "genx-resolver",
    task,
    latencyMs: 0,
  });

  const persisted = await persistProviderOutput({
    normalised,
    output: {
      result_url: poll.url ?? undefined,
      base64: poll.base64 ?? undefined,
      mimeType: poll.mimeType ?? undefined,
      providerJobId,
      status: "completed",
    },
    task,
    jobId: asset.jobId ?? `resolver-${asset.id}`,
  });

  const resolvedStatus = persisted.resultType === "failed" || persisted.resultType === "video_plan"
    ? "failed"
    : persisted.resultType === "job_pending"
      ? "processing"
      : "completed";

  await updateMediaAsset(asset.id, {
    status: resolvedStatus,
    publicUrl: persisted.publicUrl ?? undefined,
    localPath: persisted.localPath ?? undefined,
    mimeType: persisted.mimeType ?? undefined,
    errorMessage: persisted.errorMessage ?? undefined,
    outputMetadata: {
      ...meta,
      resultType: persisted.resultType,
      providerJobId,
      providerStatus: poll.providerStatus ?? "completed",
      resolvedAt: new Date().toISOString(),
    },
  });

  return {
    assetId: asset.id,
    status: resolvedStatus,
    publicUrl: persisted.publicUrl ?? undefined,
    mimeType: persisted.mimeType ?? undefined,
    providerJobId,
    message: resolvedStatus === "completed"
      ? `Resolved: ${persisted.publicUrl ?? persisted.remoteUrl ?? "no url"}`
      : persisted.errorMessage ?? "Still pending after poll.",
  };
}

export async function resolveMediaJobs(opts: {
  tenantId?: string;
  assetId?: number;
  limit?: number;
}): Promise<ResolveMediaJobsOutput> {
  const output: ResolveMediaJobsOutput = {
    resolved: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    results: [],
  };

  let pending: Awaited<ReturnType<typeof listPendingMediaAssets>>;
  try {
    pending = await listPendingMediaAssets({
      tenantId: opts.tenantId,
      assetId: opts.assetId,
      limit: opts.limit ?? 20,
    });
  } catch (err) {
    console.warn("[MediaResolver] Could not list pending assets:", err instanceof Error ? err.message : err);
    return output;
  }

  for (const asset of pending) {
    output.resolved++;
    try {
      const result = await resolveOneAsset(asset);
      output.results.push(result);
      if (result.status === "completed") output.completed++;
      if (result.status === "processing") output.processing++;
      if (result.status === "failed") output.failed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[MediaResolver] Error resolving asset ${asset.id}:`, msg);
      output.results.push({ assetId: asset.id, status: "skipped", message: `Resolver error: ${msg}` });
    }
  }

  return output;
}

export async function resolveGenXMediaAssetById(assetId: number) {
  const result = await resolveMediaJobs({ assetId, limit: 1 });
  return result.results[0] ?? { status: "missing" as const, errorMessage: "Media asset not found." };
}

export async function resolvePendingGenXMediaAssets(limit = 25) {
  return (await resolveMediaJobs({ limit })).results;
}

let _resolverTimer: ReturnType<typeof setInterval> | null = null;

export function startMediaResolverLoop(intervalMs = 30_000): void {
  if (process.env.MEDIA_RESOLVER_ENABLED === "false") {
    console.log("[MediaResolver] Auto-resolver disabled via MEDIA_RESOLVER_ENABLED=false");
    return;
  }
  if (_resolverTimer) return;

  console.log(`[MediaResolver] Starting auto-resolver loop (interval: ${intervalMs / 1000}s)`);

  _resolverTimer = setInterval(async () => {
    try {
      const result = await resolveMediaJobs({ limit: 10 });
      if (result.resolved > 0) {
        console.log(
          `[MediaResolver] Batch: resolved=${result.resolved} completed=${result.completed} processing=${result.processing} failed=${result.failed}`,
        );
      }
    } catch (err) {
      console.warn("[MediaResolver] Loop tick error:", err instanceof Error ? err.message : err);
    }
  }, intervalMs);

  if (_resolverTimer.unref) _resolverTimer.unref();
}

export function stopMediaResolverLoop(): void {
  if (_resolverTimer) {
    clearInterval(_resolverTimer);
    _resolverTimer = null;
  }
}
