// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// Brand Profile service for Growth Engine
// Persistent brand identity that feeds content generation prompts.
// One profile per tenant (upsert pattern — admin-only, not user-facing).

import { eq } from "drizzle-orm";
import { brandProfiles } from "../../../drizzle/schema";

type Db = Awaited<ReturnType<typeof import("../../db")["getDb"]>>;

async function resolveDb(): Promise<Db> {
  const dbModule = await import("../../db");
  if ("getDb" in dbModule && typeof dbModule.getDb === "function") {
    return dbModule.getDb();
  }
  return null;
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export type BrandProfileData = {
  tenantType?: string;
  tenantId: string;
  appKey?: string;
  name?: string;
  brandVoice?: string;
  targetAudience?: string;
  positioning?: string;
  primaryCta?: string;
  prohibitedClaims?: string[];
  approvedClaims?: string[];
  colors?: Record<string, string>;
  logoAssetId?: number;
  typography?: Record<string, unknown>;
  hashtagStyle?: string;
  contentPillars?: string[];
  platformDefaults?: Record<string, unknown>;
};

export async function getBrandProfile(tenantId: string) {
  const db = await resolveDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.tenantId, tenantId))
    .limit(1);

  if (!row) return null;
  return mapBrandProfileRow(row);
}

export async function upsertBrandProfile(input: BrandProfileData) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available for brand profile");

  const [existing] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.tenantId, input.tenantId))
    .limit(1);

  const values = {
    tenantType: input.tenantType ?? "individual",
    tenantId: input.tenantId,
    appKey: input.appKey ?? "equiprofile",
    name: input.name ?? "EquiProfile",
    brandVoice: input.brandVoice ?? null,
    targetAudience: input.targetAudience ?? null,
    positioning: input.positioning ?? null,
    primaryCta: input.primaryCta ?? null,
    prohibitedClaimsJson: input.prohibitedClaims
      ? JSON.stringify(input.prohibitedClaims)
      : null,
    approvedClaimsJson: input.approvedClaims
      ? JSON.stringify(input.approvedClaims)
      : null,
    colorsJson: input.colors ? JSON.stringify(input.colors) : null,
    logoAssetId: input.logoAssetId ?? null,
    typographyJson: input.typography ? JSON.stringify(input.typography) : null,
    hashtagStyle: input.hashtagStyle ?? null,
    contentPillarsJson: input.contentPillars
      ? JSON.stringify(input.contentPillars)
      : null,
    platformDefaultsJson: input.platformDefaults
      ? JSON.stringify(input.platformDefaults)
      : null,
  };

  if (existing) {
    await db
      .update(brandProfiles)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(brandProfiles.id, existing.id));
    return mapBrandProfileRow({ ...existing, ...values, updatedAt: new Date() });
  }

  const result = await db.insert(brandProfiles).values(values);
  const id = result[0].insertId;
  return {
    id,
    ...input,
    prohibitedClaims: input.prohibitedClaims ?? [],
    approvedClaims: input.approvedClaims ?? [],
    colors: input.colors ?? {},
    contentPillars: input.contentPillars ?? [],
    platformDefaults: input.platformDefaults ?? {},
  };
}

/**
 * Build a concise brand context string suitable for injection into AI prompts.
 * Returns empty string if no brand profile exists.
 */
export function buildBrandContextString(profile: ReturnType<typeof mapBrandProfileRow> | null): string {
  if (!profile) return "";
  const lines: string[] = [];
  if (profile.brandVoice) lines.push(`Brand voice: ${profile.brandVoice}`);
  if (profile.targetAudience) lines.push(`Target audience: ${profile.targetAudience}`);
  if (profile.positioning) lines.push(`Positioning: ${profile.positioning}`);
  if (profile.primaryCta) lines.push(`Primary CTA: ${profile.primaryCta}`);
  if (profile.contentPillars?.length) {
    lines.push(`Content pillars: ${profile.contentPillars.join(", ")}`);
  }
  if (profile.prohibitedClaims?.length) {
    lines.push(`Do NOT include: ${profile.prohibitedClaims.join(", ")}`);
  }
  return lines.join("\n");
}

function mapBrandProfileRow(row: typeof brandProfiles.$inferSelect) {
  return {
    id: row.id,
    tenantType: row.tenantType,
    tenantId: row.tenantId,
    appKey: row.appKey,
    name: row.name,
    brandVoice: row.brandVoice,
    targetAudience: row.targetAudience,
    positioning: row.positioning,
    primaryCta: row.primaryCta,
    prohibitedClaims: parseJson<string[]>(row.prohibitedClaimsJson, []),
    approvedClaims: parseJson<string[]>(row.approvedClaimsJson, []),
    colors: parseJson<Record<string, string>>(row.colorsJson, {}),
    logoAssetId: row.logoAssetId,
    typography: parseJson<Record<string, unknown>>(row.typographyJson, {}),
    hashtagStyle: row.hashtagStyle,
    contentPillars: parseJson<string[]>(row.contentPillarsJson, []),
    platformDefaults: parseJson<Record<string, unknown>>(row.platformDefaultsJson, {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
