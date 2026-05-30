import { and, desc, eq } from "drizzle-orm";
import { marketingBrandKits } from "../../../../drizzle/schema";
import type { MarketingBrandKitUpsertInput } from "./marketingBrandKitTypes";

type Db = Awaited<ReturnType<typeof import("../../../db")["getDb"]>>;

async function resolveDb(): Promise<Db> {
  const dbModule = await import("../../../db");
  return dbModule.getDb();
}

export async function getMarketingBrandKitRowByScope(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
}) {
  const db = await resolveDb();
  if (!db) return null;
  const [row] = await db.select().from(marketingBrandKits).where(and(
    eq(marketingBrandKits.tenantId, input.tenantId),
    eq(marketingBrandKits.workspaceId, input.workspaceId),
    eq(marketingBrandKits.hostAppId, input.hostAppId),
  )).orderBy(desc(marketingBrandKits.updatedAt)).limit(1);
  return row ?? null;
}

export async function getMarketingBrandKitRowById(id: number) {
  const db = await resolveDb();
  if (!db) return null;
  const [row] = await db.select().from(marketingBrandKits).where(eq(marketingBrandKits.id, id)).limit(1);
  return row ?? null;
}

export async function insertMarketingBrandKitRow(input: Required<MarketingBrandKitUpsertInput>) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketing brand kits");
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
  return result[0].insertId;
}

export async function updateMarketingBrandKitRow(id: number, input: Required<MarketingBrandKitUpsertInput>) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketing brand kits");
  await db.update(marketingBrandKits).set({
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
  }).where(eq(marketingBrandKits.id, id));
}
