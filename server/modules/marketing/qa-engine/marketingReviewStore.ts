import { and, desc, eq, inArray } from "drizzle-orm";
import {
  marketingCampaignItems,
  mediaAssets,
  marketingBeastModeVariants,
  marketingRenderJobs,
  marketingReviewRecords,
  marketingScheduleDrafts,
} from "../../../../drizzle/schema";
import type {
  MarketingQaChecklist,
  MarketingQaScore,
  MarketingReviewMetadata,
  MarketingReviewRecord,
  MarketingReviewStatus,
  MarketingReviewTargetType,
} from "./marketingQaTypes";

type Db = Awaited<ReturnType<typeof import("../../../db")["getDb"]>>;

async function resolveDb(): Promise<Db> {
  const dbModule = await import("../../../db");
  return dbModule.getDb();
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapRow(row: typeof marketingReviewRecords.$inferSelect): MarketingReviewRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    hostAppId: row.hostAppId,
    targetType: row.targetType as MarketingReviewTargetType,
    targetId: row.targetId,
    status: row.status as MarketingReviewStatus,
    reviewerUserId: row.reviewerUserId ?? null,
    reason: row.reason ?? null,
    metadata: parseJson<MarketingReviewMetadata | null>(row.metadataJson, null),
    checklist: parseJson<MarketingQaChecklist | null>(row.checklistJson, null),
    qaScore: parseJson<MarketingQaScore | null>(row.qaScoreJson, null),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

export async function createMarketingReviewRecord(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  targetType: MarketingReviewTargetType;
  targetId: string;
  status: MarketingReviewStatus;
  reviewerUserId?: number | null;
  reason?: string | null;
  metadata?: MarketingReviewMetadata | null;
  checklist?: MarketingQaChecklist | null;
  qaScore?: MarketingQaScore | null;
  reviewedAt?: string | null;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketing reviews");
  const result = await db.insert(marketingReviewRecords).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    targetType: input.targetType,
    targetId: input.targetId,
    status: input.status,
    reviewerUserId: input.reviewerUserId ?? null,
    reason: input.reason ?? null,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    checklistJson: input.checklist ? JSON.stringify(input.checklist) : null,
    qaScoreJson: input.qaScore ? JSON.stringify(input.qaScore) : null,
    reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null,
  });
  return result[0].insertId;
}

export async function listMarketingReviewRecords(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId?: string;
  targetType?: MarketingReviewTargetType;
  targetId?: string;
  limit?: number;
}) {
  const db = await resolveDb();
  if (!db) return [];
  const conditions = [
    eq(marketingReviewRecords.tenantId, input.tenantId),
    eq(marketingReviewRecords.workspaceId, input.workspaceId),
    ...(input.hostAppId ? [eq(marketingReviewRecords.hostAppId, input.hostAppId)] : []),
    ...(input.targetType ? [eq(marketingReviewRecords.targetType, input.targetType)] : []),
    ...(input.targetId ? [eq(marketingReviewRecords.targetId, input.targetId)] : []),
  ];
  const rows = await db
    .select()
    .from(marketingReviewRecords)
    .where(and(...conditions))
    .orderBy(desc(marketingReviewRecords.createdAt))
    .limit(input.limit ?? 100);
  return rows.map(mapRow);
}

export async function listMarketingReviewRecordsByTargets(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  targetType: MarketingReviewTargetType;
  targetIds: string[];
}) {
  if (!input.targetIds.length) return [];
  const db = await resolveDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(marketingReviewRecords)
    .where(and(
      eq(marketingReviewRecords.tenantId, input.tenantId),
      eq(marketingReviewRecords.workspaceId, input.workspaceId),
      eq(marketingReviewRecords.hostAppId, input.hostAppId),
      eq(marketingReviewRecords.targetType, input.targetType),
      inArray(marketingReviewRecords.targetId, input.targetIds),
    ))
    .orderBy(desc(marketingReviewRecords.createdAt))
    .limit(500);
  return rows.map(mapRow);
}

export async function getLatestMarketingReviewForTarget(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  targetType: MarketingReviewTargetType;
  targetId: string;
}) {
  const records = await listMarketingReviewRecords({ ...input, limit: 1 });
  return records[0] ?? null;
}

export async function setMarketingTargetReviewStatus(input: {
  targetType: MarketingReviewTargetType;
  targetId: string;
  status: MarketingReviewStatus;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketing review status");
  const targetId = Number(input.targetId);
  if (!Number.isFinite(targetId) || targetId <= 0) return;

  if (input.targetType === "campaign_item") {
    await db.update(marketingCampaignItems).set({ reviewStatus: input.status, updatedAt: new Date() }).where(eq(marketingCampaignItems.id, targetId));
  }
  if (input.targetType === "render_job") {
    await db.update(marketingRenderJobs).set({ reviewStatus: input.status, updatedAt: new Date() }).where(eq(marketingRenderJobs.id, targetId));
  }
  if (input.targetType === "schedule_draft") {
    await db.update(marketingScheduleDrafts).set({ reviewStatus: input.status, updatedAt: new Date() }).where(eq(marketingScheduleDrafts.id, targetId));
  }
  if (input.targetType === "beast_mode_variant") {
    await db.update(marketingBeastModeVariants).set({ reviewStatus: input.status, updatedAt: new Date() }).where(eq(marketingBeastModeVariants.id, targetId));
  }
  if (input.targetType === "media_asset") {
    const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, targetId)).limit(1);
    if (!row) return;
    const metadata = parseJson<Record<string, unknown>>(row.outputMetadataJson, {});
    await db.update(mediaAssets).set({
      outputMetadataJson: JSON.stringify({ ...metadata, reviewStatus: input.status }),
      updatedAt: new Date(),
    }).where(eq(mediaAssets.id, targetId));
  }
}
