import { and, desc, eq } from "drizzle-orm";
import { marketingBrandKits, marketingMediaAssetVersions } from "../../../../drizzle/schema";
import type { MarketingBrandKitInput, MarketingAssetVersionType } from "./marketingBrandKitTypes";

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

function mapBrandKit(row: typeof marketingBrandKits.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    hostAppId: row.hostAppId,
    brandName: row.brandName,
    domain: row.domain,
    tagline: row.tagline,
    primaryCta: row.primaryCta,
    secondaryCta: row.secondaryCta,
    toneOfVoice: row.toneOfVoice,
    targetAudience: row.targetAudience,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    accentColor: row.accentColor,
    logoAssetId: row.logoAssetId,
    logoUrl: row.logoUrl,
    faviconUrl: row.faviconUrl,
    overlayTemplate: row.overlayTemplate,
    defaultAspectRatio: row.defaultAspectRatio,
    safeArea: parseJson<Record<string, unknown> | null>(row.safeAreaJson, null),
    metadata: parseJson<Record<string, unknown> | null>(row.metadataJson, null),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getMarketingBrandKitByScope(input: { tenantId: string; workspaceId: string; hostAppId: string }) {
  const db = await resolveDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(marketingBrandKits)
    .where(and(
      eq(marketingBrandKits.tenantId, input.tenantId),
      eq(marketingBrandKits.workspaceId, input.workspaceId),
      eq(marketingBrandKits.hostAppId, input.hostAppId),
    ))
    .limit(1);

  return row ? mapBrandKit(row) : null;
}

export async function upsertMarketingBrandKitRecord(input: MarketingBrandKitInput) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketingBrandKits");

  const existing = await getMarketingBrandKitByScope(input);
  if (existing) {
    await db
      .update(marketingBrandKits)
      .set({
        brandName: input.brandName,
        domain: input.domain,
        tagline: input.tagline ?? null,
        primaryCta: input.primaryCta,
        secondaryCta: input.secondaryCta ?? null,
        toneOfVoice: input.toneOfVoice,
        targetAudience: input.targetAudience ?? null,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        accentColor: input.accentColor ?? null,
        logoAssetId: input.logoAssetId ?? null,
        logoUrl: input.logoUrl ?? null,
        faviconUrl: input.faviconUrl ?? null,
        overlayTemplate: input.overlayTemplate,
        defaultAspectRatio: input.defaultAspectRatio,
        safeAreaJson: input.safeArea ? JSON.stringify(input.safeArea) : null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
        updatedAt: new Date(),
      })
      .where(eq(marketingBrandKits.id, existing.id));

    const updated = await getMarketingBrandKitByScope(input);
    if (!updated) throw new Error("Failed to update marketing brand kit");
    return updated;
  }

  const result = await db.insert(marketingBrandKits).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    brandName: input.brandName,
    domain: input.domain,
    tagline: input.tagline ?? null,
    primaryCta: input.primaryCta,
    secondaryCta: input.secondaryCta ?? null,
    toneOfVoice: input.toneOfVoice,
    targetAudience: input.targetAudience ?? null,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    accentColor: input.accentColor ?? null,
    logoAssetId: input.logoAssetId ?? null,
    logoUrl: input.logoUrl ?? null,
    faviconUrl: input.faviconUrl ?? null,
    overlayTemplate: input.overlayTemplate,
    defaultAspectRatio: input.defaultAspectRatio,
    safeAreaJson: input.safeArea ? JSON.stringify(input.safeArea) : null,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
  });

  const created = await getMarketingBrandKitByScope(input);
  if (!created) throw new Error(`Failed to create marketing brand kit (${result[0].insertId})`);
  return created;
}

export async function recordMarketingAssetVersion(input: {
  tenantId: string;
  workspaceId: string;
  sourceMediaAssetId: number;
  derivedMediaAssetId: number;
  versionType: MarketingAssetVersionType;
  renderJobId?: string | null;
  brandKitId?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketingMediaAssetVersions");

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

export async function listMarketingAssetVersionsByScope(input: { tenantId: string; workspaceId: string; limit?: number }) {
  const db = await resolveDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(marketingMediaAssetVersions)
    .where(and(eq(marketingMediaAssetVersions.tenantId, input.tenantId), eq(marketingMediaAssetVersions.workspaceId, input.workspaceId)))
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
