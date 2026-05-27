// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// Media Resolver — polls pending GenX jobs and resolves them into playable assets.
//
// Usage:
//   import { resolveMediaJobs, startMediaResolverLoop } from "./_core/ai/mediaResolver";
//
// The resolver:
//  1. Finds mediaAssets rows where status=processing/queued, provider=genx,
//     and outputMetadataJson contains a providerJobId.
//  2. For each, calls GET /api/v1/jobs/:id (via pollGenXMediaJob).
//  3. On completion, downloads the file, saves it, updates the row.
//  4. On failure, marks status=failed.
//  5. On still-pending, leaves as-is.
//
// Auto-loop: startMediaResolverLoop() starts a 30s periodic resolver.
// Disable with env: MEDIA_RESOLVER_ENABLED=false

import { listPendingMediaAssets, updateMediaAsset } from "../../modules/growth-engine/mediaAssets";
import { pollGenXMediaJob } from "./providers/genxProvider";
import { persistProviderOutput, normalizeProviderOutput } from "./outputNormalization";
import type { AITask } from "./types";

const MEDIA_TASKS: AITask[] = ["text_to_image", "image_edit", "text_to_video", "image_to_video", "avatar_video", "text_to_speech"];

function taskFromString(s: string | null | undefined): AITask {
  if (s && (MEDIA_TASKS as string[]).includes(s)) return s as AITask;
  return "text_to_video";
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

/**
 * Resolve a batch of pending GenX media jobs.
 * Safe to call at any time — never throws, only logs errors.
 */
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
    const meta = asset.outputMetadata ?? {};
    const providerJobId =
      typeof meta.providerJobId === "string" && meta.providerJobId.trim()
        ? meta.providerJobId.trim()
        : null;

    if (!providerJobId) {
      output.results.push({
        assetId: asset.id,
        status: "skipped",
        message: "No providerJobId in outputMetadata — cannot poll.",
      });
      continue;
    }

    output.resolved++;
    const task = taskFromString(asset.task);

    try {
      const poll = await pollGenXMediaJob(providerJobId, task, 15_000);

      if (poll.status === "resolved") {
        // Normalize and persist the result
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
          model: typeof meta.model === "string" ? meta.model : undefined,
          task,
          latencyMs: 0,
        });

        const jobId = asset.jobId ?? `resolver-${asset.id}`;
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
          jobId,
        });

        const resolvedStatus = persisted.resultType === "failed" || persisted.resultType === "video_plan"
          ? "failed"
          : persisted.resultType === "job_pending"
            ? "processing"
            : "completed";

        await updateMediaAsset(asset.id, {
          status: resolvedStatus === "completed" ? "completed" : resolvedStatus === "processing" ? "processing" : "failed",
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

        if (resolvedStatus === "completed") {
          output.completed++;
          output.results.push({
            assetId: asset.id,
            status: "completed",
            publicUrl: persisted.publicUrl ?? undefined,
            mimeType: persisted.mimeType ?? undefined,
            providerJobId,
            message: `Resolved: ${persisted.publicUrl ?? persisted.remoteUrl ?? "no url"}`,
          });
        } else if (resolvedStatus === "processing") {
          output.processing++;
          output.results.push({ assetId: asset.id, status: "processing", providerJobId, message: "Still pending after poll." });
        } else {
          output.failed++;
          output.results.push({ assetId: asset.id, status: "failed", providerJobId, message: persisted.errorMessage ?? "Resolved as failed." });
        }
      } else if (poll.status === "failed") {
        await updateMediaAsset(asset.id, {
          status: "failed",
          errorMessage: poll.error ?? "Provider reported job failure.",
          outputMetadata: {
            ...meta,
            providerJobId,
            providerStatus: "failed",
            resolvedAt: new Date().toISOString(),
          },
        });
        output.failed++;
        output.results.push({ assetId: asset.id, status: "failed", providerJobId, message: poll.error ?? "Provider reported job failure." });
      } else {
        // still pending
        output.processing++;
        output.results.push({ assetId: asset.id, status: "processing", providerJobId, message: poll.diagnostics });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[MediaResolver] Error resolving asset ${asset.id}:`, msg);
      output.results.push({ assetId: asset.id, status: "skipped", providerJobId, message: `Resolver error: ${msg}` });
    }
  }

  return output;
}

// ─── Auto resolver loop ───────────────────────────────────────────────────────

let _resolverTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start a periodic media resolver loop.
 * Runs every 30 seconds. Never crashes the app.
 * Disable with MEDIA_RESOLVER_ENABLED=false.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function startMediaResolverLoop(intervalMs = 30_000): void {
  if (process.env.MEDIA_RESOLVER_ENABLED === "false") {
    console.log("[MediaResolver] Auto-resolver disabled via MEDIA_RESOLVER_ENABLED=false");
    return;
  }
  if (_resolverTimer) return; // already running

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

  // Don't prevent Node.js from exiting
  if (_resolverTimer.unref) _resolverTimer.unref();
}

/**
 * Stop the auto-resolver loop (e.g. during tests or graceful shutdown).
 */
export function stopMediaResolverLoop(): void {
  if (_resolverTimer) {
    clearInterval(_resolverTimer);
    _resolverTimer = null;
  }
}
