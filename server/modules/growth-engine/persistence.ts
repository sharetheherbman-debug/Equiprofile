import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  growthAnalyticsEvents,
  growthAutomationRuns,
  growthFeedback,
  growthOnboardingFlows,
  growthQueueJobs,
  growthReferrals,
  growthSocialConnections,
  marketingCampaignAssets,
  marketingCampaignItems,
  marketingCampaigns,
  marketingContacts,
  marketingScheduleDrafts,
  marketingSocialConnections,
  mediaAssets,
} from "../../../drizzle/schema";
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

type GrowthDb = Awaited<ReturnType<typeof import("../../db")["getDb"]>>;

async function resolveDb(): Promise<GrowthDb> {
  const dbModule = await import("../../db");
  if ("getDb" in dbModule && typeof dbModule.getDb === "function") {
    return dbModule.getDb();
  }
  return null;
}

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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const audit: Array<{ at: string; action: string; actor?: number; details?: string }> = Array.isArray(
    metadata.auditLog,
  )
    ? (metadata.auditLog as Array<{ at: string; action: string; actor?: number; details?: string }>)
    : [];
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
  const db = await resolveDb();
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
  provider: "genx" | "huggingface" | "qwen";
  metadata: Record<string, unknown>;
  tenantScope?: TenantScope;
}) {
  const db = await resolveDb();
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
  const db = await resolveDb();
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
        input.state === "completed" || input.state === "failed" || input.state === "cancelled"
          ? now
          : existing.completedAt,
      updatedAt: now,
      metadataJson: JSON.stringify({ ...parseJson(existing.metadataJson, {}), state: input.state }),
    })
    .where(eq(growthQueueJobs.id, idNum));

  return {
    id: String(existing.id),
    task: (existing.task || "chat") as AITask,
    provider: (existing.provider || "genx") as "genx" | "huggingface" | "qwen",
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
      input.state === "completed" || input.state === "failed" || input.state === "cancelled"
        ? now.toISOString()
        : existing.completedAt?.toISOString(),
  };
}

export async function getMediaJob(id: string) {
  const db = await resolveDb();
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
    provider: (row.provider || "genx") as "genx" | "huggingface" | "qwen",
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
  const db = await resolveDb();
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
    provider: (row.provider || "genx") as "genx" | "huggingface" | "qwen",
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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

export type MarketingCampaignStatus = "draft" | "planned" | "approved" | "archived";
export type MarketingCampaignItemType = "post" | "video" | "image" | "email" | "blog" | "short" | "script" | "ad";
export type MarketingCampaignItemStatus = "draft" | "approved" | "export_only" | "scheduled" | "posted" | "failed";
export type MarketingScheduleDraftStatus = "draft" | "approved" | "export_only" | "cancelled";
export type MarketingSocialConnectionStatus = "not_connected" | "export_only" | "setup_needed" | "ready_for_approval_posting";

const MARKETING_SOCIAL_PLATFORMS = ["Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube"] as const;

function parseArray(value: string | null | undefined): string[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
}

export async function createMarketingCampaignRecord(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  name: string;
  goal?: string;
  audience?: string;
  channels: string[];
  startDate?: string | null;
  durationDays: number;
  status?: MarketingCampaignStatus;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const result = await db.insert(marketingCampaigns).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    name: input.name,
    goal: input.goal ?? null,
    audience: input.audience ?? null,
    channelsJson: JSON.stringify(input.channels ?? []),
    startDate: input.startDate ? new Date(input.startDate) : null,
    durationDays: input.durationDays,
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  });
  return result[0].insertId;
}

export async function listMarketingCampaignRecords(input: { tenantId: string; workspaceId: string }) {
  const db = await resolveDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(marketingCampaigns)
    .where(and(eq(marketingCampaigns.tenantId, input.tenantId), eq(marketingCampaigns.workspaceId, input.workspaceId)))
    .orderBy(desc(marketingCampaigns.updatedAt))
    .limit(300);
  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    hostAppId: row.hostAppId,
    name: row.name,
    goal: row.goal ?? "",
    audience: row.audience ?? "",
    channels: parseArray(row.channelsJson),
    startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : null,
    durationDays: row.durationDays,
    status: row.status as MarketingCampaignStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getMarketingCampaignRecord(input: { id: number; tenantId: string; workspaceId: string }) {
  const db = await resolveDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(marketingCampaigns)
    .where(and(eq(marketingCampaigns.id, input.id), eq(marketingCampaigns.tenantId, input.tenantId), eq(marketingCampaigns.workspaceId, input.workspaceId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    hostAppId: row.hostAppId,
    name: row.name,
    goal: row.goal ?? "",
    audience: row.audience ?? "",
    channels: parseArray(row.channelsJson),
    startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : null,
    durationDays: row.durationDays,
    status: row.status as MarketingCampaignStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateMarketingCampaignRecord(input: {
  id: number;
  tenantId: string;
  workspaceId: string;
  patch: Partial<{
    name: string;
    goal: string;
    audience: string;
    channels: string[];
    startDate: string | null;
    durationDays: number;
    status: MarketingCampaignStatus;
  }>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.patch.name !== undefined) set.name = input.patch.name;
  if (input.patch.goal !== undefined) set.goal = input.patch.goal;
  if (input.patch.audience !== undefined) set.audience = input.patch.audience;
  if (input.patch.channels !== undefined) set.channelsJson = JSON.stringify(input.patch.channels);
  if (input.patch.startDate !== undefined) set.startDate = input.patch.startDate ? new Date(input.patch.startDate) : null;
  if (input.patch.durationDays !== undefined) set.durationDays = input.patch.durationDays;
  if (input.patch.status !== undefined) set.status = input.patch.status;
  await db
    .update(marketingCampaigns)
    .set(set)
    .where(and(eq(marketingCampaigns.id, input.id), eq(marketingCampaigns.tenantId, input.tenantId), eq(marketingCampaigns.workspaceId, input.workspaceId)));
}

export async function deleteMarketingCampaignRecord(input: { id: number; tenantId: string; workspaceId: string }) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  await db.delete(marketingCampaignAssets).where(eq(marketingCampaignAssets.campaignId, input.id));
  await db.delete(marketingScheduleDrafts).where(eq(marketingScheduleDrafts.campaignId, input.id));
  await db.delete(marketingCampaignItems).where(eq(marketingCampaignItems.campaignId, input.id));
  await db
    .delete(marketingCampaigns)
    .where(and(eq(marketingCampaigns.id, input.id), eq(marketingCampaigns.tenantId, input.tenantId), eq(marketingCampaigns.workspaceId, input.workspaceId)));
}

export async function createMarketingCampaignItemRecord(input: {
  campaignId: number;
  tenantId: string;
  type: MarketingCampaignItemType;
  platform?: string;
  title?: string;
  content?: string;
  prompt?: string;
  status?: MarketingCampaignItemStatus;
  scheduledFor?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(marketingCampaignItems).values({
    campaignId: input.campaignId,
    tenantId: input.tenantId,
    type: input.type,
    platform: input.platform ?? null,
    title: input.title ?? null,
    content: input.content ?? null,
    prompt: input.prompt ?? null,
    status: input.status ?? "export_only",
    scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
    metadataJson: JSON.stringify(input.metadata ?? {}),
  });
  return result[0].insertId;
}

export async function listMarketingCampaignItemRecords(input: { campaignId: number; tenantId: string }) {
  const db = await resolveDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(marketingCampaignItems)
    .where(and(eq(marketingCampaignItems.campaignId, input.campaignId), eq(marketingCampaignItems.tenantId, input.tenantId)))
    .orderBy(desc(marketingCampaignItems.updatedAt))
    .limit(1000);
  return rows.map((row) => ({
    id: row.id,
    campaignId: row.campaignId,
    tenantId: row.tenantId,
    type: row.type as MarketingCampaignItemType,
    platform: row.platform,
    title: row.title,
    content: row.content,
    prompt: row.prompt,
    status: row.status as MarketingCampaignItemStatus,
    scheduledFor: row.scheduledFor?.toISOString() ?? null,
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function updateMarketingCampaignItemRecord(input: {
  id: number;
  tenantId: string;
  patch: Partial<{
    type: MarketingCampaignItemType;
    platform: string;
    title: string;
    content: string;
    prompt: string;
    status: MarketingCampaignItemStatus;
    scheduledFor: string | null;
    metadata: Record<string, unknown>;
  }>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.patch.type !== undefined) set.type = input.patch.type;
  if (input.patch.platform !== undefined) set.platform = input.patch.platform;
  if (input.patch.title !== undefined) set.title = input.patch.title;
  if (input.patch.content !== undefined) set.content = input.patch.content;
  if (input.patch.prompt !== undefined) set.prompt = input.patch.prompt;
  if (input.patch.status !== undefined) set.status = input.patch.status;
  if (input.patch.scheduledFor !== undefined) set.scheduledFor = input.patch.scheduledFor ? new Date(input.patch.scheduledFor) : null;
  if (input.patch.metadata !== undefined) set.metadataJson = JSON.stringify(input.patch.metadata);
  await db
    .update(marketingCampaignItems)
    .set(set)
    .where(and(eq(marketingCampaignItems.id, input.id), eq(marketingCampaignItems.tenantId, input.tenantId)));
}

export async function deleteMarketingCampaignItemRecord(input: { id: number; tenantId: string }) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  await db.delete(marketingCampaignAssets).where(eq(marketingCampaignAssets.campaignItemId, input.id));
  await db.delete(marketingScheduleDrafts).where(eq(marketingScheduleDrafts.campaignItemId, input.id));
  await db.delete(marketingCampaignItems).where(and(eq(marketingCampaignItems.id, input.id), eq(marketingCampaignItems.tenantId, input.tenantId)));
}

export async function attachAssetToCampaignRecord(input: {
  campaignId: number;
  campaignItemId?: number | null;
  mediaAssetId: number;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db
    .select()
    .from(marketingCampaignAssets)
    .where(and(eq(marketingCampaignAssets.campaignId, input.campaignId), eq(marketingCampaignAssets.mediaAssetId, input.mediaAssetId), input.campaignItemId ? eq(marketingCampaignAssets.campaignItemId, input.campaignItemId) : sql`1=1`))
    .limit(1);
  if (existing) return existing.id;
  const result = await db.insert(marketingCampaignAssets).values({
    campaignId: input.campaignId,
    campaignItemId: input.campaignItemId ?? null,
    mediaAssetId: input.mediaAssetId,
  });
  return result[0].insertId;
}

export async function detachAssetFromCampaignRecord(input: {
  campaignId: number;
  mediaAssetId: number;
  campaignItemId?: number | null;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(marketingCampaignAssets)
    .where(
      and(
        eq(marketingCampaignAssets.campaignId, input.campaignId),
        eq(marketingCampaignAssets.mediaAssetId, input.mediaAssetId),
        input.campaignItemId === undefined
          ? sql`1=1`
          : input.campaignItemId === null
            ? sql`${marketingCampaignAssets.campaignItemId} IS NULL`
            : eq(marketingCampaignAssets.campaignItemId, input.campaignItemId),
      ),
    );
}

export async function listCampaignAssetRecords(input: { campaignId: number }) {
  const db = await resolveDb();
  if (!db) return [];
  const links = await db
    .select()
    .from(marketingCampaignAssets)
    .where(eq(marketingCampaignAssets.campaignId, input.campaignId))
    .orderBy(desc(marketingCampaignAssets.id));
  const mediaIds = Array.from(new Set(links.map((link) => link.mediaAssetId)));
  const media = mediaIds.length
    ? await db
      .select()
      .from(mediaAssets)
      .where(inArray(mediaAssets.id, mediaIds))
    : [];
  const mediaById = new Map(media.map((asset) => [asset.id, asset]));
  return links.map((link) => ({
    id: link.id,
    campaignId: link.campaignId,
    campaignItemId: link.campaignItemId,
    mediaAssetId: link.mediaAssetId,
    createdAt: link.createdAt.toISOString(),
    mediaAsset: mediaById.get(link.mediaAssetId) ? {
      id: link.mediaAssetId,
      type: mediaById.get(link.mediaAssetId)!.type,
      status: mediaById.get(link.mediaAssetId)!.status,
      mimeType: mediaById.get(link.mediaAssetId)!.mimeType,
      publicUrl: mediaById.get(link.mediaAssetId)!.publicUrl,
      generationPrompt: mediaById.get(link.mediaAssetId)!.generationPrompt,
      outputMetadata: parseJson<Record<string, unknown>>(mediaById.get(link.mediaAssetId)!.outputMetadataJson, {}),
    } : null,
  }));
}

export async function listMarketingSocialConnectionRecords(input: { tenantId: string; workspaceId: string }) {
  const db = await resolveDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(marketingSocialConnections)
    .where(and(eq(marketingSocialConnections.tenantId, input.tenantId), eq(marketingSocialConnections.workspaceId, input.workspaceId)))
    .orderBy(desc(marketingSocialConnections.updatedAt));
  const map = new Map(rows.map((row) => [row.platform, row]));
  const normalized = MARKETING_SOCIAL_PLATFORMS.map((platform) => map.get(platform) ?? null).filter(Boolean) as typeof rows;
  const missingPlatforms = MARKETING_SOCIAL_PLATFORMS.filter((platform) => !map.has(platform));
  for (const platform of missingPlatforms) {
    const insertResult = await db.insert(marketingSocialConnections).values({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      platform,
      status: "not_connected",
      requiredScopesJson: JSON.stringify([]),
      metadataJson: JSON.stringify({ mode: "export_only" }),
    });
    const [created] = await db.select().from(marketingSocialConnections).where(eq(marketingSocialConnections.id, insertResult[0].insertId)).limit(1);
    if (created) normalized.push(created);
  }
  return normalized.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    platform: row.platform,
    status: row.status as MarketingSocialConnectionStatus,
    accountName: row.accountName,
    requiredScopes: parseArray(row.requiredScopesJson),
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function upsertMarketingSocialConnectionRecord(input: {
  tenantId: string;
  workspaceId: string;
  platform: (typeof MARKETING_SOCIAL_PLATFORMS)[number];
  status: MarketingSocialConnectionStatus;
  accountName?: string | null;
  requiredScopes?: string[];
  lastCheckedAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db
    .select()
    .from(marketingSocialConnections)
    .where(and(eq(marketingSocialConnections.tenantId, input.tenantId), eq(marketingSocialConnections.workspaceId, input.workspaceId), eq(marketingSocialConnections.platform, input.platform)))
    .limit(1);
  if (existing) {
    await db
      .update(marketingSocialConnections)
      .set({
        status: input.status,
        accountName: input.accountName ?? null,
        requiredScopesJson: JSON.stringify(input.requiredScopes ?? []),
        lastCheckedAt: input.lastCheckedAt ? new Date(input.lastCheckedAt) : null,
        metadataJson: JSON.stringify(input.metadata ?? {}),
        updatedAt: new Date(),
      })
      .where(eq(marketingSocialConnections.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(marketingSocialConnections).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    platform: input.platform,
    status: input.status,
    accountName: input.accountName ?? null,
    requiredScopesJson: JSON.stringify(input.requiredScopes ?? []),
    lastCheckedAt: input.lastCheckedAt ? new Date(input.lastCheckedAt) : null,
    metadataJson: JSON.stringify(input.metadata ?? {}),
  });
  return result[0].insertId;
}

export async function createMarketingScheduleDraftRecord(input: {
  tenantId: string;
  workspaceId: string;
  campaignId?: number | null;
  campaignItemId?: number | null;
  platform: string;
  title: string;
  content?: string;
  scheduledFor: string;
  status?: MarketingScheduleDraftStatus;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(marketingScheduleDrafts).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    campaignId: input.campaignId ?? null,
    campaignItemId: input.campaignItemId ?? null,
    platform: input.platform,
    title: input.title,
    content: input.content ?? null,
    scheduledFor: new Date(input.scheduledFor),
    status: input.status ?? "draft",
  });
  return result[0].insertId;
}

export async function listMarketingScheduleDraftRecords(input: { tenantId: string; workspaceId: string }) {
  const db = await resolveDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(marketingScheduleDrafts)
    .where(and(eq(marketingScheduleDrafts.tenantId, input.tenantId), eq(marketingScheduleDrafts.workspaceId, input.workspaceId)))
    .orderBy(desc(marketingScheduleDrafts.scheduledFor))
    .limit(400);
  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    campaignId: row.campaignId,
    campaignItemId: row.campaignItemId,
    platform: row.platform,
    title: row.title,
    content: row.content,
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status as MarketingScheduleDraftStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function updateMarketingScheduleDraftRecord(input: {
  id: number;
  tenantId: string;
  workspaceId: string;
  patch: Partial<{
    platform: string;
    title: string;
    content: string;
    scheduledFor: string;
    status: MarketingScheduleDraftStatus;
  }>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.patch.platform !== undefined) set.platform = input.patch.platform;
  if (input.patch.title !== undefined) set.title = input.patch.title;
  if (input.patch.content !== undefined) set.content = input.patch.content;
  if (input.patch.scheduledFor !== undefined) set.scheduledFor = new Date(input.patch.scheduledFor);
  if (input.patch.status !== undefined) set.status = input.patch.status;
  await db
    .update(marketingScheduleDrafts)
    .set(set)
    .where(and(eq(marketingScheduleDrafts.id, input.id), eq(marketingScheduleDrafts.tenantId, input.tenantId), eq(marketingScheduleDrafts.workspaceId, input.workspaceId)));
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
  const db = await resolveDb();
  if (!db) {
    return { id: 0, ...input };
  }

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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
  const db = await resolveDb();
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
