import { Queue } from "bullmq";
import { processMarketingRenderJob, startMarketingRenderWorker } from "./marketingRenderWorker";

let queue: Queue<{ jobId: string }> | null = null;

function redisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

function getQueue() {
  if (!redisConfigured()) return null;
  if (!queue) {
    queue = new Queue<{ jobId: string }>("marketing-render-jobs", {
      connection: { url: process.env.REDIS_URL },
    });
  }
  return queue;
}

export async function enqueueMarketingRenderJob(jobId: string) {
  const q = getQueue();
  if (!q) {
    return processMarketingRenderJob(jobId);
  }
  startMarketingRenderWorker();
  await q.add("render", { jobId }, { removeOnComplete: true, removeOnFail: true });
  return { status: "queued" as const };
}

export function isRedisRenderQueueEnabled() {
  return redisConfigured();
}
