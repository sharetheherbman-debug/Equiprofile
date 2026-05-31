import { and, desc, eq } from "drizzle-orm";
import { marketingProviderModels } from "../../../../drizzle/schema";
import type { MarketingProviderModelRecord } from "./providerCapabilityTypes";

async function getDb() {
  const dbModule = await import("../../../db");
  return dbModule.getDb();
}

function parseArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parseObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function listMarketingProviderModels(input: { tenantId: string; workspaceId: string; provider?: string }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(marketingProviderModels)
    .where(
      input.provider
        ? and(
          eq(marketingProviderModels.tenantId, input.tenantId),
          eq(marketingProviderModels.workspaceId, input.workspaceId),
          eq(marketingProviderModels.provider, input.provider),
        )
        : and(eq(marketingProviderModels.tenantId, input.tenantId), eq(marketingProviderModels.workspaceId, input.workspaceId)),
    )
    .orderBy(desc(marketingProviderModels.updatedAt));

  return rows.map((row) => ({
    provider: row.provider,
    modelId: row.modelId,
    displayName: row.displayName,
    category: row.category,
    supportedTasks: parseArray(row.supportedTasksJson),
    inputModalities: parseArray(row.inputModalitiesJson),
    outputModalities: parseArray(row.outputModalitiesJson),
    maxContextTokens: row.maxContextTokens,
    maxDurationSeconds: row.maxDurationSeconds,
    supportedAspectRatios: parseArray(row.supportedAspectRatiosJson),
    supportedLanguages: parseArray(row.supportedLanguagesJson),
    costTier: row.costTier,
    pricing: parseObject(row.pricingJson),
    qualityTier: row.qualityTier,
    isAvailable: Boolean(row.isAvailable),
    setupStatus: row.setupStatus,
    source: row.source,
    metadata: parseObject(row.metadataJson),
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  })) as MarketingProviderModelRecord[];
}

export async function upsertMarketingProviderModel(input: { tenantId: string; workspaceId: string; model: MarketingProviderModelRecord }) {
  const db = await getDb();
  if (!db) return null;
  const [existing] = await db
    .select()
    .from(marketingProviderModels)
    .where(and(
      eq(marketingProviderModels.tenantId, input.tenantId),
      eq(marketingProviderModels.workspaceId, input.workspaceId),
      eq(marketingProviderModels.provider, input.model.provider),
      eq(marketingProviderModels.modelId, input.model.modelId),
    ))
    .limit(1);

  const patch = {
    displayName: input.model.displayName,
    category: input.model.category,
    supportedTasksJson: JSON.stringify(input.model.supportedTasks),
    inputModalitiesJson: JSON.stringify(input.model.inputModalities),
    outputModalitiesJson: JSON.stringify(input.model.outputModalities),
    maxContextTokens: input.model.maxContextTokens,
    maxDurationSeconds: input.model.maxDurationSeconds,
    supportedAspectRatiosJson: JSON.stringify(input.model.supportedAspectRatios),
    supportedLanguagesJson: JSON.stringify(input.model.supportedLanguages),
    costTier: input.model.costTier,
    pricingJson: input.model.pricing ? JSON.stringify(input.model.pricing) : null,
    qualityTier: input.model.qualityTier,
    isAvailable: input.model.isAvailable,
    setupStatus: input.model.setupStatus,
    source: input.model.source,
    metadataJson: JSON.stringify(input.model.metadata ?? {}),
    lastSyncedAt: input.model.lastSyncedAt ? new Date(input.model.lastSyncedAt) : new Date(),
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(marketingProviderModels).set(patch).where(eq(marketingProviderModels.id, existing.id));
    return existing.id;
  }

  const inserted = await db.insert(marketingProviderModels).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    provider: input.model.provider,
    modelId: input.model.modelId,
    ...patch,
  });
  return inserted[0].insertId;
}
