// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// Queue Hardening — Documented adapter interface with in-process fallback.
//
// BullMQ/Redis is NOT yet activated in this update because Redis availability
// has not been confirmed on this deployment. This file provides:
//
//   1. A typed QueueAdapter interface
//   2. FallbackQueueAdapter — in-process fallback matching current orchestrator behaviour
//   3. Queue name constants for future BullMQ activation
//   4. getQueueStatus() for admin diagnostics
//
// ─── Next steps to activate BullMQ ───────────────────────────────────────────
//  1. Confirm Redis is available: `redis-cli ping` should return PONG
//  2. Set REDIS_URL env var: redis://localhost:6379 or redis://:password@host:port
//  3. Install BullMQ: npm install bullmq
//  4. Implement BullMQAdapter below replacing FallbackQueueAdapter
//  5. Update getQueueAdapter() to detect REDIS_URL and return BullMQAdapter
//
// Do NOT activate BullMQ without confirmed Redis. A half-implemented queue
// is worse than the current in-process fallback.
// ─────────────────────────────────────────────────────────────────────────────

export type QueueJobInput = {
  id: string;
  task: string;
  provider?: string;
  payload: Record<string, unknown>;
  tenantId?: string;
  attempts?: number;
  maxAttempts?: number;
  runAfter?: Date;
};

export type QueueStatus = {
  name: string;
  ready: boolean;
  pendingCount: number;
  failedCount?: number;
  mode: "fallback" | "bullmq";
};

export type QueueAdapter = {
  enqueue(job: QueueJobInput): Promise<void>;
  getStatus(): Promise<QueueStatus[]>;
};

// ─── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  AI_GENERATION: "ai-generation",
  MEDIA_GENERATION: "media-generation",
  GROWTH_ANALYSIS: "growth-analysis",
  PUBLISH_PREP: "publish-prep",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Fallback adapter ─────────────────────────────────────────────────────────
// Matches current orchestrator behaviour (setTimeout-based).
// Tracks pending job count for diagnostics.

class FallbackQueueAdapter implements QueueAdapter {
  private pendingByQueue: Map<string, Set<string>> = new Map();
  private failedCount = 0;

  async enqueue(job: QueueJobInput): Promise<void> {
    const queue = job.task ?? "default";
    const pending = this.pendingByQueue.get(queue) ?? new Set<string>();
    pending.add(job.id);
    this.pendingByQueue.set(queue, pending);

    const delay = job.runAfter ? Math.max(0, job.runAfter.getTime() - Date.now()) : 0;

    setTimeout(() => {
      const current = this.pendingByQueue.get(queue);
      if (current) {
        current.delete(job.id);
      }
    }, delay + 30_000); // Clean up tracking after 30s
  }

  async getStatus(): Promise<QueueStatus[]> {
    const totalPending = Array.from(this.pendingByQueue.values()).reduce(
      (sum, set) => sum + set.size,
      0,
    );

    return [
      {
        name: "fallback-in-process",
        ready: true,
        pendingCount: totalPending,
        failedCount: this.failedCount,
        mode: "fallback",
      },
    ];
  }
}

// ─── Adapter singleton ────────────────────────────────────────────────────────

let _adapter: QueueAdapter | null = null;

export function getQueueAdapter(): QueueAdapter {
  if (!_adapter) {
    // Future: detect REDIS_URL here and return BullMQAdapter if available
    // const redisUrl = process.env.REDIS_URL;
    // if (redisUrl) { _adapter = new BullMQAdapter(redisUrl); }
    _adapter = new FallbackQueueAdapter();
  }
  return _adapter;
}

// ─── Admin diagnostics ────────────────────────────────────────────────────────

export async function getQueueStatus() {
  const adapter = getQueueAdapter();
  const queues = await adapter.getStatus();

  const hasRedis = !!process.env.REDIS_URL;

  return {
    mode: "fallback-in-process" as const,
    redisConfigured: hasRedis,
    bullmqActive: false,
    note: hasRedis
      ? "REDIS_URL is set but BullMQ has not yet been activated. Install bullmq and implement BullMQAdapter."
      : "No REDIS_URL configured. Media jobs run via in-process setTimeout. Safe for low volume.",
    queues,
    nextSteps: [
      "1. Confirm Redis is running: redis-cli ping",
      "2. Set REDIS_URL=redis://localhost:6379 in .env",
      "3. Run: npm install bullmq",
      "4. Implement BullMQAdapter in server/modules/growth-engine/queues.ts",
      "5. Update getQueueAdapter() to return BullMQAdapter when REDIS_URL is set",
    ],
  };
}
