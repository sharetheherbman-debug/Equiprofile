import { randomUUID } from "crypto";
import type { AITask, MediaJobState, TenantScope } from "../types";

type MediaJob = {
  id: string;
  task: AITask;
  provider: "genx" | "huggingface";
  tenantScope?: TenantScope;
  state: MediaJobState;
  metadata: Record<string, unknown>;
  outputs?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

class MediaJobManager {
  private jobs = new Map<string, MediaJob>();

  createJob(task: AITask, provider: "genx" | "huggingface", metadata: Record<string, unknown>, tenantScope?: TenantScope) {
    const now = new Date().toISOString();
    const job: MediaJob = {
      id: randomUUID(),
      task,
      provider,
      tenantScope,
      state: "job_created",
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    this.transition(job.id, "queued");
    return job;
  }

  transition(id: string, state: MediaJobState, patch: Partial<MediaJob> = {}) {
    const job = this.mustGet(id);
    job.state = state;
    Object.assign(job, patch);
    job.updatedAt = new Date().toISOString();
    if (state === "completed" || state === "failed") {
      job.completedAt = job.updatedAt;
    }
    return job;
  }

  list(filter: { state?: MediaJobState; tenantId?: string } = {}) {
    return [...this.jobs.values()].filter((job) => {
      if (filter.state && job.state !== filter.state) return false;
      if (filter.tenantId && job.tenantScope?.tenantId !== filter.tenantId) return false;
      return true;
    });
  }

  get(id: string) {
    return this.jobs.get(id);
  }

  cancel(id: string) {
    const job = this.mustGet(id);
    if (job.state === "completed" || job.state === "failed") return job;
    return this.transition(id, "failed", { error: "Cancelled by operator" });
  }

  private mustGet(id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Media job not found: ${id}`);
    return job;
  }
}

export const mediaJobManager = new MediaJobManager();
