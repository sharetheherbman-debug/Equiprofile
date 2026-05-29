import { Queue } from "bullmq";
import IORedis from "ioredis";
import { processMarketingRenderJob } from "./marketingRenderWorker";
import { startMarketingRenderWorker } from "./marketingRenderWorker";

let queue: Queue<{ jobId: string }> | null = null;
let connection: IORedis | null = null;

function redisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

function getQueue() {
  if (!redisConfigured()) return null;
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  }
  if (!queue) {
    queue = new Queue<{ jobId: string }>("marketing-render-jobs", { connection });
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
