import { and, desc, eq, inArray } from "drizzle-orm";
import { marketingBeastModeRuns, marketingBeastModeVariants } from "../../../../drizzle/schema";
import type { BeastModeLanguage, BeastModeMode, BeastModeRunRecord, BeastModeStatus, BeastModeVariantContentType, BeastModeVariantRecord } from "./beastModeTypes";
import type { CampaignPlatform } from "../campaign-engine";

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type Db = Awaited<ReturnType<typeof import("../../../db")["getDb"]>>;
async function resolveDb(): Promise<Db> {
  const dbModule = await import("../../../db");
  return dbModule.getDb();
}

function mapRun(row: typeof marketingBeastModeRuns.$inferSelect): BeastModeRunRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    hostAppId: row.hostAppId,
    campaignId: row.campaignId ?? null,
    brandKitId: row.brandKitId ?? null,
    name: row.name,
    goal: row.goal,
    audience: row.audience,
    mode: row.mode as BeastModeMode,
    requestedVariantCount: row.requestedVariantCount,
    requestedLanguages: parseJson<BeastModeLanguage[]>(row.requestedLanguagesJson, ["English"]),
    requestedPlatforms: parseJson<CampaignPlatform[]>(row.requestedPlatformsJson, []),
    status: row.status as BeastModeStatus,
    plan: parseJson<Record<string, unknown>>(row.planJson, {}),
    summary: parseJson<Record<string, unknown>>(row.summaryJson, {}),
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function mapVariant(row: typeof marketingBeastModeVariants.$inferSelect): BeastModeVariantRecord {
  return {
    id: row.id,
    runId: row.runId,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    campaignId: row.campaignId ?? null,
    campaignItemId: row.campaignItemId ?? null,
    platform: row.platform as CampaignPlatform,
    contentType: row.contentType as BeastModeVariantContentType,
    language: row.language as BeastModeLanguage,
    angle: row.angle,
    hook: row.hook,
    body: row.body,
    cta: row.cta,
    hashtags: parseJson<string[]>(row.hashtagsJson, []),
    visualPrompt: row.visualPrompt,
    studioPlan: parseJson(row.studioPlanJson, null),
    renderJobId: row.renderJobId ?? null,
    mediaAssetId: row.mediaAssetId ?? null,
    reviewStatus: row.reviewStatus as BeastModeVariantRecord["reviewStatus"],
    exportStatus: row.exportStatus,
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createMarketingBeastModeRunRecord(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  campaignId?: number | null;
  brandKitId?: number | null;
  name: string;
  goal: string;
  audience: string;
  mode: BeastModeMode;
  requestedVariantCount: number;
  requestedLanguages: BeastModeLanguage[];
  requestedPlatforms: CampaignPlatform[];
  status?: BeastModeStatus;
  plan?: Record<string, unknown>;
  summary?: Record<string, unknown>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const result = await db.insert(marketingBeastModeRuns).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    campaignId: input.campaignId ?? null,
    brandKitId: input.brandKitId ?? null,
    name: input.name,
    goal: input.goal,
    audience: input.audience,
    mode: input.mode,
    requestedVariantCount: input.requestedVariantCount,
    requestedLanguagesJson: JSON.stringify(input.requestedLanguages),
    requestedPlatformsJson: JSON.stringify(input.requestedPlatforms),
    status: input.status ?? "draft",
    planJson: JSON.stringify(input.plan ?? {}),
    summaryJson: JSON.stringify(input.summary ?? {}),
    createdAt: now,
    updatedAt: now,
  });
  return result[0].insertId;
}

export async function getMarketingBeastModeRunRecord(input: { id: number; tenantId: string; workspaceId: string }) {
  const db = await resolveDb();
  if (!db) return null;
  const [row] = await db.select().from(marketingBeastModeRuns)
    .where(and(eq(marketingBeastModeRuns.id, input.id), eq(marketingBeastModeRuns.tenantId, input.tenantId), eq(marketingBeastModeRuns.workspaceId, input.workspaceId)))
    .limit(1);
  return row ? mapRun(row) : null;
}

export async function listMarketingBeastModeRunRecords(input: { tenantId: string; workspaceId: string; campaignId?: number | null }) {
  const db = await resolveDb();
  if (!db) return [];
  const conditions = [eq(marketingBeastModeRuns.tenantId, input.tenantId), eq(marketingBeastModeRuns.workspaceId, input.workspaceId)];
  if (typeof input.campaignId === "number") conditions.push(eq(marketingBeastModeRuns.campaignId, input.campaignId));
  const rows = await db.select().from(marketingBeastModeRuns).where(and(...conditions)).orderBy(desc(marketingBeastModeRuns.updatedAt)).limit(100);
  return rows.map(mapRun);
}

export async function updateMarketingBeastModeRunRecord(input: {
  id: number;
  tenantId: string;
  workspaceId: string;
  patch: Partial<{
    status: BeastModeStatus;
    plan: Record<string, unknown>;
    summary: Record<string, unknown>;
    errorMessage: string | null;
    completedAt: Date | null;
  }>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.patch.status !== undefined) set.status = input.patch.status;
  if (input.patch.plan !== undefined) set.planJson = JSON.stringify(input.patch.plan);
  if (input.patch.summary !== undefined) set.summaryJson = JSON.stringify(input.patch.summary);
  if (input.patch.errorMessage !== undefined) set.errorMessage = input.patch.errorMessage;
  if (input.patch.completedAt !== undefined) set.completedAt = input.patch.completedAt;
  await db.update(marketingBeastModeRuns).set(set)
    .where(and(eq(marketingBeastModeRuns.id, input.id), eq(marketingBeastModeRuns.tenantId, input.tenantId), eq(marketingBeastModeRuns.workspaceId, input.workspaceId)));
}

export async function createMarketingBeastModeVariantRecords(input: {
  runId: number;
  tenantId: string;
  workspaceId: string;
  campaignId?: number | null;
  variants: Array<{
    campaignItemId?: number | null;
    platform: CampaignPlatform;
    contentType: BeastModeVariantContentType;
    language: BeastModeLanguage;
    angle: string;
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
    visualPrompt: string;
    studioPlan: Record<string, unknown> | null;
    renderJobId?: number | null;
    mediaAssetId?: number | null;
    reviewStatus?: string;
    exportStatus?: string;
    metadata?: Record<string, unknown>;
  }>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  if (!input.variants.length) return [] as number[];
  const result = await db.insert(marketingBeastModeVariants).values(input.variants.map((variant) => ({
    runId: input.runId,
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    campaignId: input.campaignId ?? null,
    campaignItemId: variant.campaignItemId ?? null,
    platform: variant.platform,
    contentType: variant.contentType,
    language: variant.language,
    angle: variant.angle,
    hook: variant.hook,
    body: variant.body,
    cta: variant.cta,
    hashtagsJson: JSON.stringify(variant.hashtags),
    visualPrompt: variant.visualPrompt,
    studioPlanJson: variant.studioPlan ? JSON.stringify(variant.studioPlan) : null,
    renderJobId: variant.renderJobId ?? null,
    mediaAssetId: variant.mediaAssetId ?? null,
    reviewStatus: variant.reviewStatus ?? "needs_review",
    exportStatus: variant.exportStatus ?? "draft",
    metadataJson: JSON.stringify(variant.metadata ?? {}),
  })));
  return result.map((entry) => entry.insertId).filter((value): value is number => Number.isFinite(value));
}

export async function listMarketingBeastModeVariantRecords(input: { runId: number; tenantId: string; workspaceId: string }) {
  const db = await resolveDb();
  if (!db) return [];
  const rows = await db.select().from(marketingBeastModeVariants)
    .where(and(eq(marketingBeastModeVariants.runId, input.runId), eq(marketingBeastModeVariants.tenantId, input.tenantId), eq(marketingBeastModeVariants.workspaceId, input.workspaceId)))
    .orderBy(desc(marketingBeastModeVariants.updatedAt))
    .limit(1000);
  return rows.map(mapVariant);
}

export async function listMarketingBeastModeVariantsByIds(ids: number[]) {
  const db = await resolveDb();
  if (!db || !ids.length) return [];
  const rows = await db.select().from(marketingBeastModeVariants).where(inArray(marketingBeastModeVariants.id, ids));
  return rows.map(mapVariant);
}

export async function updateMarketingBeastModeVariantRecord(input: {
  id: number;
  tenantId: string;
  workspaceId: string;
  patch: Partial<{
    campaignItemId: number | null;
    renderJobId: number | null;
    mediaAssetId: number | null;
    reviewStatus: string;
    exportStatus: string;
    metadata: Record<string, unknown>;
  }>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available");
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.patch.campaignItemId !== undefined) set.campaignItemId = input.patch.campaignItemId;
  if (input.patch.renderJobId !== undefined) set.renderJobId = input.patch.renderJobId;
  if (input.patch.mediaAssetId !== undefined) set.mediaAssetId = input.patch.mediaAssetId;
  if (input.patch.reviewStatus !== undefined) set.reviewStatus = input.patch.reviewStatus;
  if (input.patch.exportStatus !== undefined) set.exportStatus = input.patch.exportStatus;
  if (input.patch.metadata !== undefined) set.metadataJson = JSON.stringify(input.patch.metadata);
  await db.update(marketingBeastModeVariants).set(set)
    .where(and(eq(marketingBeastModeVariants.id, input.id), eq(marketingBeastModeVariants.tenantId, input.tenantId), eq(marketingBeastModeVariants.workspaceId, input.workspaceId)));
}
