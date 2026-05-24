import type { ApprovalStatus, AITask, TenantScope } from "../types";
import {
  createApprovalDraft,
  listApprovals,
  updateApprovalStatus,
} from "../../../modules/growth-engine";

type ApprovalItem = {
  id: string;
  task: AITask;
  tenantScope?: TenantScope;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  outputDraft?: unknown;
  reviewedBy?: number;
  rejectionReason?: string;
  scheduleAt?: string;
  auditLog: Array<{ at: string; action: string; actor?: number; details?: string }>;
  createdAt: string;
  updatedAt: string;
};

class ApprovalQueue {
  async createDraft(
    task: AITask,
    payload: Record<string, unknown>,
    tenantScope?: TenantScope,
    outputDraft?: unknown,
  ): Promise<ApprovalItem> {
    return createApprovalDraft({ task, payload, tenantScope, outputDraft });
  }

  async submitForReview(id: string): Promise<ApprovalItem> {
    return updateApprovalStatus({
      id,
      status: "needs_review",
      action: "submitted_for_review",
    });
  }

  async approve(id: string, reviewerId: number): Promise<ApprovalItem> {
    return updateApprovalStatus({
      id,
      status: "approved",
      action: "approved",
      actor: reviewerId,
      reviewedBy: reviewerId,
    });
  }

  async reject(id: string, reviewerId: number, reason: string): Promise<ApprovalItem> {
    return updateApprovalStatus({
      id,
      status: "rejected",
      action: "rejected",
      actor: reviewerId,
      details: reason,
      reviewedBy: reviewerId,
      rejectionReason: reason,
    });
  }

  async schedule(id: string, scheduleAt: string): Promise<ApprovalItem> {
    return updateApprovalStatus({
      id,
      status: "scheduled",
      action: "scheduled",
      details: scheduleAt,
      scheduleAt,
    });
  }

  async markPublished(id: string): Promise<ApprovalItem> {
    return updateApprovalStatus({
      id,
      status: "published",
      action: "published",
    });
  }

  async markFailed(id: string, reason: string): Promise<ApprovalItem> {
    return updateApprovalStatus({
      id,
      status: "failed",
      action: "failed",
      details: reason,
      rejectionReason: reason,
    });
  }

  async list(filter: { status?: ApprovalStatus; tenantId?: string } = {}): Promise<ApprovalItem[]> {
    return listApprovals(filter);
  }
}

export const aiApprovalQueue = new ApprovalQueue();
