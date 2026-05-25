import type { AITask, MediaJobState, TenantScope } from "../types";
import {
  createMediaJob,
  getMediaJob,
  listMediaJobs,
  transitionMediaJob,
} from "../../../modules/growth-engine";

type MediaJob = {
  id: string;
  task: AITask;
  provider: "genx" | "huggingface" | "qwen";
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
  async createJob(
    task: AITask,
    provider: "genx" | "huggingface" | "qwen",
    metadata: Record<string, unknown>,
    tenantScope?: TenantScope,
  ): Promise<MediaJob> {
    return createMediaJob({ task, provider, metadata, tenantScope });
  }

  async transition(id: string, state: MediaJobState, patch: Partial<MediaJob> = {}): Promise<MediaJob> {
    return transitionMediaJob({
      id,
      state,
      patch: {
        outputs: patch.outputs,
        error: patch.error,
      },
    });
  }

  async list(filter: { state?: MediaJobState; tenantId?: string } = {}): Promise<MediaJob[]> {
    return listMediaJobs(filter);
  }

  async get(id: string): Promise<MediaJob | undefined> {
    return getMediaJob(id);
  }

  async cancel(id: string): Promise<MediaJob> {
    const job = await this.get(id);
    if (!job) {
      throw new Error(`Media job not found: ${id}`);
    }
    if (job.state === "completed" || job.state === "failed") return job;
    return this.transition(id, "failed", { error: "Cancelled by operator" });
  }
}

export const mediaJobManager = new MediaJobManager();
