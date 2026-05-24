import { and, desc, eq, sql } from "drizzle-orm";
import {
  growthAnalyticsEvents,
  growthAutomationRuns,
  growthFeedback,
  growthOnboardingFlows,
  growthQueueJobs,
  growthReferrals,
  growthSocialConnections,
  marketingContacts,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import type {
  ApprovalStatus,
  AITask,
  MediaJobState,
  TenantScope,
} from "../../_core/ai/types";
import type {
  GrowthFunnelEvent,
  OnboardingType,
  SocialConnectionState,
  SocialPlatform,
} from "./types";

function parseJson<T = unknown>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function tenantTypeFromScope(scope?: TenantScope): string {
  return scope?.tenantType ?? "individual";
}

function tenantIdFromScope(scope?: TenantScope): string {
  return scope?.tenantId ?? "global";
}

export async function createApprovalDraft(input: {
  task: AITask;
  tenantScope?: TenantScope;
  payload: Record<string, unknown>;
  outputDraft?: unknown;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is required for approval persistence");
  }

  const now = new Date();
  const audit = [{ at: now.toISOString(), action: "draft_created" }];

  const result = await db.insert(growthQueueJobs).values({
    queueType: "approval",
    status: "draft",
    task: input.task,
    provider: null,
    tenantType: tenantTypeFromScope(input.tenantScope),
    tenantId: tenantIdFromScope(input.tenantScope),
    payloadJson: JSON.stringify(input.payload ?? {}),
    outputJson: input.outputDraft ? JSON.stringify(input.outputDraft) : null,
    metadataJson: JSON.stringify({ auditLog: audit }),
    attempts: 0,
    maxAttempts: 3,
    runAfter: now,
  });

  const id = result[0].insertId;
  return {
    id: String(id),
    task: input.task,
    tenantScope: input.tenantScope,
    status: "draft" as ApprovalStatus,
    payload: input.payload,
    outputDraft: input.outputDraft,
    auditLog: audit,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function updateApprovalStatus(input: {
  id: string;
  status: ApprovalStatus;
  action: string;
  actor?: number;
  details?: string;
  reviewedBy?: number;
  rejectionReason?: string;
  scheduleAt?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is required for approval persistence");
  }

  const idNum = Number(input.id);
  const [existing] = await db
    .select()
    .from(growthQueueJobs)
    .where(and(eq(growthQueueJobs.id, idNum), eq(growthQueueJobs.queueType, "approval")))
    .limit(1);

  if (!existing) {
    throw new Error(`Approval item not found: ${input.id}`);
  }

  const metadata = parseJson<Record<string, unknown>>(existing.metadataJson, {});
  const audit = Array.isArray(metadata.auditLog) ? [...(metadata.auditLog as Array<Record<string, unknown>>)] : [];
  const nowIso = new Date().toISOString();
  audit.unshift({ at: nowIso, action: input.action, actor: input.actor, details: input.details });

  await db
    .update(growthQueueJobs)
    .set({
      status: input.status,
      reviewedByUserId: input.reviewedBy ?? existing.reviewedByUserId,
      rejectionReason: input.rejectionReason ?? existing.rejectionReason,
      scheduleAt: input.scheduleAt ? new Date(input.scheduleAt) : existing.scheduleAt,
      metadataJson: JSON.stringify({ ...metadata, auditLog: audit }),
      updatedAt: new Date(),
    })
    .where(eq(growthQueueJobs.id, idNum));

  return {
    id: String(existing.id),
    task: (existing.task || "chat") as AITask,
    status: input.status,
    tenantScope: {
      tenantType: (existing.tenantType as TenantScope["tenantType"]) || "stable",
      tenantId: existing.tenantId,
      initiatedByUserId: existing.createdByUserId ?? undefined,
    },
    payload: parseJson(existing.payloadJson, {}),
    outputDraft: parseJson(existing.outputJson, null),
    reviewedBy: input.reviewedBy ?? existing.reviewedByUserId ?? undefined,
    rejectionReason: input.rejectionReason ?? existing.rejectionReason ?? undefined,
    scheduleAt: input.scheduleAt ?? existing.scheduleAt?.toISOString(),
    auditLog: audit,
    createdAt: existing.createdAt.toISOString(),
    updatedAt: nowIso,
  };
}

export async function listApprovals(filter: { status?: ApprovalStatus; tenantId?: string } = {}) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(growthQueueJobs)
    .where(
      and(
        eq(growthQueueJobs.queueType, "approval"),
        filter.status ? eq(growthQueueJobs.status, filter.status) : sql`1 = 1`,
        filter.tenantId ? eq(growthQueueJobs.tenantId, filter.tenantId) : sql`1 = 1`,
      ),
    )
    .orderBy(desc(growthQueueJobs.updatedAt))
    .limit(200);

  return rows.map((row) => {
    const metadata = parseJson<Record<string, unknown>>(row.metadataJson, {});
    return {
      id: String(row.id),
      task: (row.task || "chat") as AITask,
      tenantScope: {
        tenantType: (row.tenantType as TenantScope["tenantType"]) || "stable",
        tenantId: row.tenantId,
        initiatedByUserId: row.createdByUserId ?? undefined,
      },
      status: (row.status || "draft") as ApprovalStatus,
      payload: parseJson(row.payloadJson, {}),
      outputDraft: parseJson(row.outputJson, null),
      reviewedBy: row.reviewedByUserId ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      scheduleAt: row.scheduleAt?.toISOString(),
      auditLog: Array.isArray(metadata.auditLog)
        ? (metadata.auditLog as Array<{ at: string; action: string; actor?: number; details?: string }>)
        : [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function createMediaJob(input: {
  task: AITask;
  provider: "genx" | "huggingface";
  metadata: Record<string, unknown>;
  tenantScope?: TenantScope;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is required for media job persistence");
  }

  const now = new Date();
  const result = await db.insert(growthQueueJobs).values({
    queueType: "media",
    status: "queued",
    task: input.task,
    provider: input.provider,
    tenantType: tenantTypeFromScope(input.tenantScope),
    tenantId: tenantIdFromScope(input.tenantScope),
    payloadJson: JSON.stringify(input.metadata ?? {}),
    outputJson: null,
    metadataJson: JSON.stringify({ state: "queued" }),
    attempts: 0,
    maxAttempts: 3,
    runAfter: now,
  });

  const id = result[0].insertId;
  return {
    id: String(id),
    task: input.task,
    provider: input.provider,
    tenantScope: input.tenantScope,
    state: "queued" as MediaJobState,
    metadata: input.metadata,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function transitionMediaJob(input: {
  id: string;
  state: MediaJobState;
  patch?: {
    outputs?: unknown;
    error?: string;
  };
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is required for media job persistence");
  }

  const idNum = Number(input.id);
  const [existing] = await db
    .select()
    .from(growthQueueJobs)
    .where(and(eq(growthQueueJobs.id, idNum), eq(growthQueueJobs.queueType, "media")))
    .limit(1);

  if (!existing) {
    throw new Error(`Media job not found: ${input.id}`);
  }

  const now = new Date();
  await db
    .update(growthQueueJobs)
    .set({
      status: input.state,
      outputJson:
        input.patch?.outputs !== undefined
          ? JSON.stringify(input.patch.outputs)
          : existing.outputJson,
      errorMessage: input.patch?.error ?? existing.errorMessage,
      completedAt:
        input.state === "completed" || input.state === "failed" ? now : existing.completedAt,
      updatedAt: now,
      metadataJson: JSON.stringify({ ...parseJson(existing.metadataJson, {}), state: input.state }),
    })
    .where(eq(growthQueueJobs.id, idNum));

  return {
    id: String(existing.id),
    task: (existing.task || "chat") as AITask,
    provider: (existing.provider || "genx") as "genx" | "huggingface",
    tenantScope: {
      tenantType: (existing.tenantType as TenantScope["tenantType"]) || "stable",
      tenantId: existing.tenantId,
      initiatedByUserId: existing.createdByUserId ?? undefined,
    },
    state: input.state,
    metadata: parseJson(existing.payloadJson, {}),
    outputs: input.patch?.outputs ?? parseJson(existing.outputJson, null),
    error: input.patch?.error ?? existing.errorMessage ?? undefined,
    createdAt: existing.createdAt.toISOString(),
    updatedAt: now.toISOString(),
    completedAt:
      input.state === "completed" || input.state === "failed"
        ? now.toISOString()
        : existing.completedAt?.toISOString(),
  };
}

export async function getMediaJob(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const idNum = Number(id);
  const [row] = await db
    .select()
    .from(growthQueueJobs)
    .where(and(eq(growthQueueJobs.id, idNum), eq(growthQueueJobs.queueType, "media")))
    .limit(1);

  if (!row) return undefined;

  return {
    id: String(row.id),
    task: (row.task || "chat") as AITask,
    provider: (row.provider || "genx") as "genx" | "huggingface",
    tenantScope: {
      tenantType: (row.tenantType as TenantScope["tenantType"]) || "stable",
      tenantId: row.tenantId,
      initiatedByUserId: row.createdByUserId ?? undefined,
    },
    state: (row.status || "queued") as MediaJobState,
    metadata: parseJson(row.payloadJson, {}),
    outputs: parseJson(row.outputJson, null),
    error: row.errorMessage ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}

export async function listMediaJobs(filter: { state?: MediaJobState; tenantId?: string } = {}) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(growthQueueJobs)
    .where(
      and(
        eq(growthQueueJobs.queueType, "media"),
        filter.state ? eq(growthQueueJobs.status, filter.state) : sql`1 = 1`,
        filter.tenantId ? eq(growthQueueJobs.tenantId, filter.tenantId) : sql`1 = 1`,
      ),
    )
    .orderBy(desc(growthQueueJobs.updatedAt))
    .limit(200);

  return rows.map((row) => ({
    id: String(row.id),
    task: (row.task || "chat") as AITask,
    provider: (row.provider || "genx") as "genx" | "huggingface",
    tenantScope: {
      tenantType: (row.tenantType as TenantScope["tenantType"]) || "stable",
      tenantId: row.tenantId,
      initiatedByUserId: row.createdByUserId ?? undefined,
    },
    state: (row.status || "queued") as MediaJobState,
    metadata: parseJson(row.payloadJson, {}),
    outputs: parseJson(row.outputJson, null),
    error: row.errorMessage ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  }));
}

export async function upsertSocialConnection(input: {
  tenantId: string;
  platform: SocialPlatform;
  state: SocialConnectionState;
  encryptedAccessToken?: string | null;
  encryptedRefreshToken?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db
    .select()
    .from(growthSocialConnections)
    .where(
      and(
        eq(growthSocialConnections.tenantId, input.tenantId),
        eq(growthSocialConnections.platform, input.platform),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(growthSocialConnections)
      .set({
        state: input.state,
        encryptedAccessToken:
          input.encryptedAccessToken !== undefined
            ? input.encryptedAccessToken
            : existing.encryptedAccessToken,
        encryptedRefreshToken:
          input.encryptedRefreshToken !== undefined
            ? input.encryptedRefreshToken
            : existing.encryptedRefreshToken,
        tokenExpiresAt:
          input.expiresAt !== undefined ? input.expiresAt : existing.tokenExpiresAt,
        metadataJson:
          input.metadata !== undefined
            ? JSON.stringify(input.metadata)
            : existing.metadataJson,
        updatedAt: new Date(),
      })
      .where(eq(growthSocialConnections.id, existing.id));
    return { ...existing, state: input.state };
  }

  const result = await db.insert(growthSocialConnections).values({
    tenantId: input.tenantId,
    platform: input.platform,
    state: input.state,
    encryptedAccessToken: input.encryptedAccessToken ?? null,
    encryptedRefreshToken: input.encryptedRefreshToken ?? null,
    tokenExpiresAt: input.expiresAt ?? null,
    metadataJson: JSON.stringify(input.metadata ?? {}),
  });

  return { id: result[0].insertId, ...input };
}

export async function listSocialConnections(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(growthSocialConnections)
    .where(eq(growthSocialConnections.tenantId, tenantId))
    .orderBy(desc(growthSocialConnections.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    platform: row.platform as SocialPlatform,
    state: row.state as SocialConnectionState,
    expiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    metadata: parseJson(row.metadataJson, {}),
    updatedAt: row.updatedAt.toISOString(),
    hasToken: Boolean(row.encryptedAccessToken),
  }));
}

export async function upsertOnboardingFlow(input: {
  userId: number;
  tenantId: string;
  onboardingType: OnboardingType;
  status: "not_started" | "in_progress" | "completed" | "skipped";
  step: number;
  progressPercent: number;
  checklist: Record<string, boolean>;
  quickWins: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db
    .select()
    .from(growthOnboardingFlows)
    .where(
      and(
        eq(growthOnboardingFlows.userId, input.userId),
        eq(growthOnboardingFlows.tenantId, input.tenantId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(growthOnboardingFlows)
      .set({
        onboardingType: input.onboardingType,
        status: input.status,
        step: input.step,
        progressPercent: input.progressPercent,
        checklistJson: JSON.stringify(input.checklist ?? {}),
        quickWinsJson: JSON.stringify(input.quickWins ?? []),
        completedAt: input.status === "completed" ? new Date() : existing.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(growthOnboardingFlows.id, existing.id));
    return { ...existing, ...input };
  }

  const result = await db.insert(growthOnboardingFlows).values({
    userId: input.userId,
    tenantId: input.tenantId,
    onboardingType: input.onboardingType,
    status: input.status,
    step: input.step,
    progressPercent: input.progressPercent,
    checklistJson: JSON.stringify(input.checklist ?? {}),
    quickWinsJson: JSON.stringify(input.quickWins ?? []),
    completedAt: input.status === "completed" ? new Date() : null,
  });

  return { id: result[0].insertId, ...input };
}

export async function getOnboardingFlow(userId: number, tenantId: string) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(growthOnboardingFlows)
    .where(
      and(eq(growthOnboardingFlows.userId, userId), eq(growthOnboardingFlows.tenantId, tenantId)),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    onboardingType: row.onboardingType as OnboardingType,
    status: row.status,
    step: row.step,
    progressPercent: row.progressPercent,
    checklist: parseJson<Record<string, boolean>>(row.checklistJson, {}),
    quickWins: parseJson<string[]>(row.quickWinsJson, []),
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertCrmContact(input: {
  email: string;
  tenantId: string;
  tenantType: string;
  contactType: string;
  source: string;
  name?: string | null;
  organizationName?: string | null;
  status?: string;
  lifecycleTags?: string[];
  onboardingStatus?: string;
  referralCode?: string | null;
  engagementScore?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedEmail = input.email.trim().toLowerCase();
  const [existing] = await db
    .select()
    .from(marketingContacts)
    .where(
      and(
        eq(marketingContacts.email, normalizedEmail),
        eq(marketingContacts.tenantId, input.tenantId),
      ),
    )
    .limit(1);

  const tags = [...new Set([...(input.lifecycleTags ?? []), ...(parseJson<string[]>(existing?.tags, []) ?? [])])];

  if (existing) {
    await db
      .update(marketingContacts)
      .set({
        name: input.name ?? existing.name,
        organizationName: input.organizationName ?? existing.organizationName,
        contactType: input.contactType,
        source: input.source,
        status: input.status ?? existing.status,
        tags: JSON.stringify(tags),
        onboardingStatus: input.onboardingStatus ?? existing.onboardingStatus,
        referralCode: input.referralCode ?? existing.referralCode,
        engagementScore:
          input.engagementScore !== undefined
            ? input.engagementScore
            : existing.engagementScore,
        metadataJson:
          input.metadata !== undefined
            ? JSON.stringify(input.metadata)
            : existing.metadataJson,
        updatedAt: new Date(),
      })
      .where(eq(marketingContacts.id, existing.id));
    return { id: existing.id, email: normalizedEmail, tags };
  }

  const unsubscribeToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const result = await db.insert(marketingContacts).values({
    email: normalizedEmail,
    name: input.name ?? null,
    organizationName: input.organizationName ?? null,
    businessName: input.organizationName ?? null,
    contactType: input.contactType,
    source: input.source,
    status: input.status ?? "active",
    unsubscribeToken,
    tags: JSON.stringify(input.lifecycleTags ?? []),
    tenantId: input.tenantId,
    tenantType: input.tenantType,
    onboardingStatus: input.onboardingStatus ?? "not_started",
    referralCode: input.referralCode ?? null,
    engagementScore: input.engagementScore ?? 0,
    metadataJson: JSON.stringify(input.metadata ?? {}),
  });

  return { id: result[0].insertId, email: normalizedEmail, tags: input.lifecycleTags ?? [] };
}

export async function listCrmContacts(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(marketingContacts)
    .where(eq(marketingContacts.tenantId, tenantId))
    .orderBy(desc(marketingContacts.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    organizationName: row.organizationName,
    tenantId: row.tenantId,
    tenantType: row.tenantType,
    contactType: row.contactType,
    source: row.source,
    status: row.status,
    onboardingStatus: row.onboardingStatus,
    referralCode: row.referralCode,
    engagementScore: row.engagementScore ?? 0,
    lifecycleTags: parseJson<string[]>(row.tags, []),
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createReferral(input: {
  tenantId: string;
  inviterUserId?: number;
  inviteeEmail?: string | null;
  referralType: "stable" | "school" | "academy" | "yard" | "general";
  source: string;
  code: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(growthReferrals).values({
    tenantId: input.tenantId,
    inviterUserId: input.inviterUserId ?? null,
    inviteeEmail: input.inviteeEmail ?? null,
    referralType: input.referralType,
    source: input.source,
    referralCode: input.code,
    status: "sent",
    metadataJson: JSON.stringify(input.metadata ?? {}),
  });

  return { id: result[0].insertId, ...input };
}

export async function listReferrals(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(growthReferrals)
    .where(eq(growthReferrals.tenantId, tenantId))
    .orderBy(desc(growthReferrals.createdAt));

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    inviterUserId: row.inviterUserId,
    inviteeEmail: row.inviteeEmail,
    referralType: row.referralType,
    source: row.source,
    code: row.referralCode,
    status: row.status,
    convertedAt: row.convertedAt?.toISOString() ?? null,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function recordLifecycleRun(input: {
  tenantId: string;
  contactId?: number;
  workflowKey: string;
  runStatus: "queued" | "processing" | "completed" | "failed" | "needs_approval";
  triggerSource: string;
  triggerEvent: string;
  runAt?: Date;
  payload?: Record<string, unknown>;
  outcome?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(growthAutomationRuns).values({
    tenantId: input.tenantId,
    contactId: input.contactId ?? null,
    workflowKey: input.workflowKey,
    runStatus: input.runStatus,
    triggerSource: input.triggerSource,
    triggerEvent: input.triggerEvent,
    runAt: input.runAt ?? new Date(),
    payloadJson: JSON.stringify(input.payload ?? {}),
    outcomeJson: JSON.stringify(input.outcome ?? {}),
  });

  return { id: result[0].insertId, ...input };
}

export async function listLifecycleRuns(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(growthAutomationRuns)
    .where(eq(growthAutomationRuns.tenantId, tenantId))
    .orderBy(desc(growthAutomationRuns.runAt))
    .limit(200);

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    contactId: row.contactId,
    workflowKey: row.workflowKey,
    runStatus: row.runStatus,
    triggerSource: row.triggerSource,
    triggerEvent: row.triggerEvent,
    runAt: row.runAt.toISOString(),
    payload: parseJson(row.payloadJson, {}),
    outcome: parseJson(row.outcomeJson, {}),
  }));
}

export async function recordFunnelEvent(event: GrowthFunnelEvent) {
  const db = await getDb();
  if (!db) return { skipped: true };

  const result = await db.insert(growthAnalyticsEvents).values({
    tenantId: event.tenantId,
    actorUserId: event.actorUserId ?? null,
    eventType: event.eventType,
    stage: event.stage,
    source: event.source ?? null,
    metadataJson: JSON.stringify(event.metadata ?? {}),
  });

  return { id: result[0].insertId };
}

export async function getFunnelSummary(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      stage: growthAnalyticsEvents.stage,
      eventType: growthAnalyticsEvents.eventType,
      count: sql<number>`COUNT(*)`,
    })
    .from(growthAnalyticsEvents)
    .where(eq(growthAnalyticsEvents.tenantId, tenantId))
    .groupBy(growthAnalyticsEvents.stage, growthAnalyticsEvents.eventType)
    .orderBy(desc(sql`COUNT(*)`));
}

export async function submitFeedback(input: {
  tenantId: string;
  userId?: number;
  feedbackType: "feedback" | "bug" | "feature_request" | "onboarding_feedback" | "support" | "nps";
  title: string;
  description: string;
  satisfactionScore?: number | null;
  status?: "new" | "reviewing" | "planned" | "resolved";
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(growthFeedback).values({
    tenantId: input.tenantId,
    userId: input.userId ?? null,
    feedbackType: input.feedbackType,
    title: input.title,
    description: input.description,
    satisfactionScore: input.satisfactionScore ?? null,
    status: input.status ?? "new",
    metadataJson: JSON.stringify(input.metadata ?? {}),
  });

  return { id: result[0].insertId };
}

export async function listFeedback(tenantId: string) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(growthFeedback)
    .where(eq(growthFeedback.tenantId, tenantId))
    .orderBy(desc(growthFeedback.createdAt));

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    feedbackType: row.feedbackType,
    title: row.title,
    description: row.description,
    satisfactionScore: row.satisfactionScore,
    status: row.status,
    metadata: parseJson(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
  }));
}
