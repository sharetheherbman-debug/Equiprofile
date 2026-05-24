// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
// Brand Avatar service for Growth Engine
// Persistent brand character memory injected into avatar/video generation prompts.
// Ensures visual and personality consistency across avatar content.

import { and, desc, eq } from "drizzle-orm";
import { brandAvatars } from "../../../drizzle/schema";

type Db = Awaited<ReturnType<typeof import("../../db")["getDb"]>>;

async function resolveDb(): Promise<Db> {
  const dbModule = await import("../../db");
  if ("getDb" in dbModule && typeof dbModule.getDb === "function") {
    return dbModule.getDb();
  }
  return null;
}

export type BrandAvatarInput = {
  tenantType?: string;
  tenantId: string;
  brandProfileId?: number;
  name: string;
  role?: string;
  visualDescription?: string;
  personality?: string;
  voiceStyle?: string;
  accent?: string;
  wardrobeRules?: string;
  backgroundRules?: string;
  referenceAssetId?: number;
  promptTemplate?: string;
  negativePrompt?: string;
  consistencySeed?: string;
  status?: "active" | "archived";
};

export async function listBrandAvatars(tenantId: string) {
  const db = await resolveDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(brandAvatars)
    .where(and(eq(brandAvatars.tenantId, tenantId), eq(brandAvatars.status, "active")))
    .orderBy(desc(brandAvatars.createdAt));

  return rows.map(mapAvatarRow);
}

export async function getActiveBrandAvatar(tenantId: string) {
  const db = await resolveDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(brandAvatars)
    .where(and(eq(brandAvatars.tenantId, tenantId), eq(brandAvatars.status, "active")))
    .orderBy(desc(brandAvatars.createdAt))
    .limit(1);

  if (!row) return null;
  return mapAvatarRow(row);
}

export async function createBrandAvatar(input: BrandAvatarInput) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available for brand avatar");

  const result = await db.insert(brandAvatars).values({
    tenantType: input.tenantType ?? "individual",
    tenantId: input.tenantId,
    brandProfileId: input.brandProfileId ?? null,
    name: input.name,
    role: input.role ?? null,
    visualDescription: input.visualDescription ?? null,
    personality: input.personality ?? null,
    voiceStyle: input.voiceStyle ?? null,
    accent: input.accent ?? null,
    wardrobeRules: input.wardrobeRules ?? null,
    backgroundRules: input.backgroundRules ?? null,
    referenceAssetId: input.referenceAssetId ?? null,
    promptTemplate: input.promptTemplate ?? null,
    negativePrompt: input.negativePrompt ?? null,
    consistencySeed: input.consistencySeed ?? null,
    status: input.status ?? "active",
  });

  return { id: result[0].insertId, ...input };
}

export async function updateBrandAvatar(
  id: number,
  patch: Partial<Omit<BrandAvatarInput, "tenantId">>,
) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available for brand avatar");

  await db
    .update(brandAvatars)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(brandAvatars.id, id));
}

export async function archiveBrandAvatar(id: number) {
  const db = await resolveDb();
  if (!db) throw new Error("Database not available for brand avatar");

  await db
    .update(brandAvatars)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(brandAvatars.id, id));
}

/**
 * Build an avatar identity injection string for AI generation prompts.
 * Returns empty string if no avatar is available.
 */
export function buildAvatarPromptContext(
  avatar: ReturnType<typeof mapAvatarRow> | null,
): string {
  if (!avatar) return "";
  const lines: string[] = [`Avatar: ${avatar.name}`];
  if (avatar.role) lines.push(`Role: ${avatar.role}`);
  if (avatar.visualDescription) lines.push(`Appearance: ${avatar.visualDescription}`);
  if (avatar.personality) lines.push(`Personality: ${avatar.personality}`);
  if (avatar.voiceStyle) lines.push(`Voice style: ${avatar.voiceStyle}`);
  if (avatar.accent) lines.push(`Accent: ${avatar.accent}`);
  if (avatar.wardrobeRules) lines.push(`Wardrobe: ${avatar.wardrobeRules}`);
  if (avatar.backgroundRules) lines.push(`Background: ${avatar.backgroundRules}`);
  if (avatar.promptTemplate) lines.push(`Prompt template: ${avatar.promptTemplate}`);
  if (avatar.negativePrompt) lines.push(`Negative prompt (exclude): ${avatar.negativePrompt}`);
  if (avatar.consistencySeed) lines.push(`Consistency seed: ${avatar.consistencySeed}`);
  return lines.join("\n");
}

function mapAvatarRow(row: typeof brandAvatars.$inferSelect) {
  return {
    id: row.id,
    tenantType: row.tenantType,
    tenantId: row.tenantId,
    brandProfileId: row.brandProfileId,
    name: row.name,
    role: row.role,
    visualDescription: row.visualDescription,
    personality: row.personality,
    voiceStyle: row.voiceStyle,
    accent: row.accent,
    wardrobeRules: row.wardrobeRules,
    backgroundRules: row.backgroundRules,
    referenceAssetId: row.referenceAssetId,
    promptTemplate: row.promptTemplate,
    negativePrompt: row.negativePrompt,
    consistencySeed: row.consistencySeed,
    status: row.status as "active" | "archived",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
