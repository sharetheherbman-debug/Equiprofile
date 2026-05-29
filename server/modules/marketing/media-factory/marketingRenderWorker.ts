import { Worker } from "bullmq";
import { createMediaAsset } from "../../growth-engine";
import {
  getMarketingRenderJobById,
  updateMarketingRenderJobRecord,
} from "./marketingRenderJobStore";
import { renderMarketingTimeline } from "./marketingRenderer";

let redisWorker: Worker<{ jobId: string }> | null = null;

export function startMarketingRenderWorker() {
  if (!process.env.REDIS_URL || redisWorker) return redisWorker;
  redisWorker = new Worker<{ jobId: string }>(
    "marketing-render-jobs",
    async (job) => processMarketingRenderJob(job.data.jobId),
    {
      connection: { url: process.env.REDIS_URL },
    },
  );
  return redisWorker;
}

export async function processMarketingRenderJob(jobId: string) {
  const job = await getMarketingRenderJobById(jobId);
  if (!job) {
    return { status: "failed" as const, errorMessage: "Render job not found" };
  }

  if (job.status === "cancelled") {
    return { status: "cancelled" as const };
  }

  await updateMarketingRenderJobRecord({ id: job.id, status: "processing", errorMessage: null });

  const rendered = await renderMarketingTimeline({
    jobId: job.id,
    timeline: job.timeline,
    brandOverlay: job.brandOverlay,
    testMode: process.env.NODE_ENV === "test" || process.env.MARKETING_RENDER_TEST_MODE === "true",
  });

  if (rendered.status === "setup_needed") {
    const setupJob = await updateMarketingRenderJobRecord({
      id: job.id,
      status: "setup_needed",
      errorMessage: rendered.errorMessage,
    });
    return {
      status: "setup_needed" as const,
      job: setupJob,
      errorMessage: rendered.errorMessage,
    };
  }

  const mediaAsset = await createMediaAsset({
    tenantId: job.tenantId,
    type: "video",
    provider: "media_factory",
    task: "assembled_video",
    status: "completed",
    localPath: rendered.output.filePath,
    publicUrl: rendered.output.publicUrl,
    mimeType: rendered.output.mimeType,
    fileSizeBytes: rendered.output.sizeBytes,
    durationSeconds: rendered.output.durationSeconds,
    generationPrompt: job.originalUserPrompt,
    outputMetadata: {
      renderJobId: job.id,
      renderMode: job.renderMode,
      contentType: job.contentType,
      durationSeconds: rendered.output.durationSeconds,
      scenesCount: job.timeline.scenes.length,
      captionMode: job.captions.mode,
      brandOverlay: {
        brandName: job.brandOverlay.brandName,
        domain: job.brandOverlay.domain,
        cta: job.brandOverlay.cta,
      },
      source: "media_factory",
      renderWarnings: rendered.warnings ?? [],
    },
  });

  const completedJob = await updateMarketingRenderJobRecord({
    id: job.id,
    status: "completed",
    outputMediaAssetId: mediaAsset.id,
    outputPublicUrl: rendered.output.publicUrl,
    warnings: rendered.warnings ?? [],
    errorMessage: null,
    completedAt: new Date(),
  });

  return {
    status: "completed" as const,
    job: completedJob,
    output: rendered.output,
  };
}
