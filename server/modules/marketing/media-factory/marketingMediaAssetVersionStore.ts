import { and, desc, eq } from "drizzle-orm";
import { marketingMediaAssetVersions } from "../../../../drizzle/schema";

export type MarketingMediaAssetVersionType =
  | "original"
  | "branded"
  | "captioned"
  | "voiceover_added"
  | "resized"
  | "campaign_export";

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

export async function createMarketingAssetVersionRecord(input: {
  tenantId: string;
  workspaceId: string;
  sourceMediaAssetId: number;
  derivedMediaAssetId: number;
  versionType: MarketingMediaAssetVersionType;
  renderJobId?: number | null;
  brandKitId?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketing media asset versions");

  const result = await db.insert(marketingMediaAssetVersions).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    sourceMediaAssetId: input.sourceMediaAssetId,
    derivedMediaAssetId: input.derivedMediaAssetId,
    versionType: input.versionType,
    renderJobId: input.renderJobId ?? null,
    brandKitId: input.brandKitId ?? null,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
  });

  return result[0].insertId;
}

export async function listMarketingAssetVersions(input: {
  tenantId: string;
  workspaceId: string;
  sourceMediaAssetId?: number;
  derivedMediaAssetId?: number;
  limit?: number;
}) {
  const db = await resolveDb();
  if (!db) return [];

  const conditions = [
    eq(marketingMediaAssetVersions.tenantId, input.tenantId),
    eq(marketingMediaAssetVersions.workspaceId, input.workspaceId),
  ];
  if (input.sourceMediaAssetId) conditions.push(eq(marketingMediaAssetVersions.sourceMediaAssetId, input.sourceMediaAssetId));
  if (input.derivedMediaAssetId) conditions.push(eq(marketingMediaAssetVersions.derivedMediaAssetId, input.derivedMediaAssetId));

  const rows = await db.select().from(marketingMediaAssetVersions)
    .where(and(...conditions))
    .orderBy(desc(marketingMediaAssetVersions.createdAt))
    .limit(input.limit ?? 200);

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    sourceMediaAssetId: row.sourceMediaAssetId,
    derivedMediaAssetId: row.derivedMediaAssetId,
    versionType: row.versionType,
    renderJobId: row.renderJobId,
    brandKitId: row.brandKitId,
    metadata: parseJson<Record<string, unknown>>(row.metadataJson, {}),
    createdAt: row.createdAt.toISOString(),
  }));
}
