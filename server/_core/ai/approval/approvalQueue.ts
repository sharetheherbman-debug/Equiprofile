import { randomUUID } from "crypto";
import type { ApprovalStatus, AITask, TenantScope } from "../types";

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
  private queue = new Map<string, ApprovalItem>();

  createDraft(task: AITask, payload: Record<string, unknown>, tenantScope?: TenantScope, outputDraft?: unknown) {
    const now = new Date().toISOString();
    const id = randomUUID();
    const item: ApprovalItem = {
      id,
      task,
      tenantScope,
      payload,
      outputDraft,
      status: "draft",
      auditLog: [{ at: now, action: "draft_created" }],
      createdAt: now,
      updatedAt: now,
    };
    this.queue.set(id, item);
    return item;
  }

  submitForReview(id: string) {
    const item = this.mustGet(id);
    item.status = "needs_review";
    item.updatedAt = new Date().toISOString();
    item.auditLog.unshift({ at: item.updatedAt, action: "submitted_for_review" });
    return item;
  }

  approve(id: string, reviewerId: number) {
    const item = this.mustGet(id);
    item.status = "approved";
    item.reviewedBy = reviewerId;
    item.updatedAt = new Date().toISOString();
    item.auditLog.unshift({ at: item.updatedAt, action: "approved", actor: reviewerId });
    return item;
  }

  reject(id: string, reviewerId: number, reason: string) {
    const item = this.mustGet(id);
    item.status = "rejected";
    item.reviewedBy = reviewerId;
    item.rejectionReason = reason;
    item.updatedAt = new Date().toISOString();
    item.auditLog.unshift({ at: item.updatedAt, action: "rejected", actor: reviewerId, details: reason });
    return item;
  }

  schedule(id: string, scheduleAt: string) {
    const item = this.mustGet(id);
    item.status = "scheduled";
    item.scheduleAt = scheduleAt;
    item.updatedAt = new Date().toISOString();
    item.auditLog.unshift({ at: item.updatedAt, action: "scheduled", details: scheduleAt });
    return item;
  }

  markPublished(id: string) {
    const item = this.mustGet(id);
    item.status = "published";
    item.updatedAt = new Date().toISOString();
    item.auditLog.unshift({ at: item.updatedAt, action: "published" });
    return item;
  }

  markFailed(id: string, reason: string) {
    const item = this.mustGet(id);
    item.status = "failed";
    item.updatedAt = new Date().toISOString();
    item.auditLog.unshift({ at: item.updatedAt, action: "failed", details: reason });
    return item;
  }

  list(filter: { status?: ApprovalStatus; tenantId?: string } = {}) {
    const items = [...this.queue.values()];
    return items.filter((item) => {
      if (filter.status && item.status !== filter.status) return false;
      if (filter.tenantId && item.tenantScope?.tenantId !== filter.tenantId) return false;
      return true;
    });
  }

  private mustGet(id: string): ApprovalItem {
    const item = this.queue.get(id);
    if (!item) {
      throw new Error(`Approval item not found: ${id}`);
    }
    return item;
  }
}

export const aiApprovalQueue = new ApprovalQueue();
