import { and, desc, eq } from "drizzle-orm";
import { marketingVisualQaRecords } from "../../../../drizzle/schema";
import type { VisualQaIssue, VisualQaRecord, VisualQaScore, VisualQaStatus, VisualQaTargetType } from "./visualQaTypes";

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

function mapRow(row: typeof marketingVisualQaRecords.$inferSelect): VisualQaRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    hostAppId: row.hostAppId,
    targetType: row.targetType as VisualQaTargetType,
    targetId: row.targetId,
    status: row.status as VisualQaStatus,
    expectedSubject: row.expectedSubject ?? null,
    expectedBrand: row.expectedBrand ?? null,
    expectedAudience: row.expectedAudience ?? null,
    frameUrls: parseJson<string[]>(row.frameUrlsJson, []),
    thumbnailUrl: row.thumbnailUrl ?? null,
    detectedLabels: parseJson<string[]>(row.detectedLabelsJson, []),
    issues: parseJson<VisualQaIssue[]>(row.issuesJson, []),
    score: parseJson<VisualQaScore | null>(row.scoreJson, null),
    reviewerUserId: row.reviewerUserId ?? null,
    reviewNotes: row.reviewNotes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

export async function createVisualQaRecord(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  targetType: VisualQaTargetType;
  targetId: string;
  status: VisualQaStatus;
  expectedSubject?: string | null;
  expectedBrand?: string | null;
  expectedAudience?: string | null;
  frameUrls?: string[];
  thumbnailUrl?: string | null;
  detectedLabels?: string[];
  issues?: VisualQaIssue[];
  score?: VisualQaScore | null;
  reviewerUserId?: number | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for visual QA records");
  const result = await db.insert(marketingVisualQaRecords).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    targetType: input.targetType,
    targetId: input.targetId,
    status: input.status,
    expectedSubject: input.expectedSubject ?? null,
    expectedBrand: input.expectedBrand ?? null,
    expectedAudience: input.expectedAudience ?? null,
    frameUrlsJson: input.frameUrls?.length ? JSON.stringify(input.frameUrls) : null,
    thumbnailUrl: input.thumbnailUrl ?? null,
    detectedLabelsJson: input.detectedLabels?.length ? JSON.stringify(input.detectedLabels) : null,
    issuesJson: input.issues?.length ? JSON.stringify(input.issues) : null,
    scoreJson: input.score ? JSON.stringify(input.score) : null,
    reviewerUserId: input.reviewerUserId ?? null,
    reviewNotes: input.reviewNotes ?? null,
    reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null,
  });
  return result[0].insertId;
}

export async function listVisualQaRecords(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId?: string;
  targetType?: VisualQaTargetType;
  targetId?: string;
  limit?: number;
}) {
  const db = await resolveDb();
  if (!db) return [];
  const conditions = [
    eq(marketingVisualQaRecords.tenantId, input.tenantId),
    eq(marketingVisualQaRecords.workspaceId, input.workspaceId),
    ...(input.hostAppId ? [eq(marketingVisualQaRecords.hostAppId, input.hostAppId)] : []),
    ...(input.targetType ? [eq(marketingVisualQaRecords.targetType, input.targetType)] : []),
    ...(input.targetId ? [eq(marketingVisualQaRecords.targetId, input.targetId)] : []),
  ];
  const rows = await db
    .select()
    .from(marketingVisualQaRecords)
    .where(and(...conditions))
    .orderBy(desc(marketingVisualQaRecords.createdAt))
    .limit(input.limit ?? 100);
  return rows.map(mapRow);
}

export async function getLatestVisualQaForTarget(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  targetType: VisualQaTargetType;
  targetId: string;
}) {
  const records = await listVisualQaRecords({ ...input, limit: 1 });
  return records[0] ?? null;
}

export async function updateVisualQaRecord(input: {
  id: number;
  status: VisualQaStatus;
  reviewerUserId?: number | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  issues?: VisualQaIssue[];
  score?: VisualQaScore | null;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for visual QA update");
  await db
    .update(marketingVisualQaRecords)
    .set({
      status: input.status,
      reviewerUserId: input.reviewerUserId ?? null,
      reviewNotes: input.reviewNotes ?? null,
      reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null,
      issuesJson: input.issues ? JSON.stringify(input.issues) : undefined,
      scoreJson: input.score ? JSON.stringify(input.score) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(marketingVisualQaRecords.id, input.id));
}
