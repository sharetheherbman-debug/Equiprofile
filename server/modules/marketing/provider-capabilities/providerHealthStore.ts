import { and, desc, eq } from "drizzle-orm";
import { marketingProviderHealthChecks } from "../../../../drizzle/schema";
import type { MarketingHealthStatus, MarketingProviderName } from "./providerCapabilityTypes";

async function getDb() {
  const dbModule = await import("../../../db");
  return dbModule.getDb();
}

export type ProviderHealthRecord = {
  provider: MarketingProviderName;
  modelId: string | null;
  task: string | null;
  status: MarketingHealthStatus;
  latencyMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
};

export async function createMarketingProviderHealthCheck(input: {
  tenantId: string;
  workspaceId: string;
  provider: MarketingProviderName;
  modelId?: string | null;
  task?: string | null;
  status: MarketingHealthStatus;
  latencyMs?: number | null;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(marketingProviderHealthChecks).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    provider: input.provider,
    modelId: input.modelId ?? null,
    task: input.task ?? null,
    status: input.status,
    latencyMs: input.latencyMs ?? null,
    errorMessage: input.errorMessage ?? null,
    checkedAt: new Date(),
  });
  return result[0].insertId;
}

export async function listMarketingProviderHealthChecks(input: { tenantId: string; workspaceId: string; provider?: MarketingProviderName }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(marketingProviderHealthChecks)
    .where(
      input.provider
        ? and(
          eq(marketingProviderHealthChecks.tenantId, input.tenantId),
          eq(marketingProviderHealthChecks.workspaceId, input.workspaceId),
          eq(marketingProviderHealthChecks.provider, input.provider),
        )
        : and(
          eq(marketingProviderHealthChecks.tenantId, input.tenantId),
          eq(marketingProviderHealthChecks.workspaceId, input.workspaceId),
        ),
    )
    .orderBy(desc(marketingProviderHealthChecks.checkedAt));

  return rows.map((row) => ({
    provider: row.provider as MarketingProviderName,
    modelId: row.modelId ?? null,
    task: row.task ?? null,
    status: row.status as MarketingHealthStatus,
    latencyMs: row.latencyMs ?? null,
    errorMessage: row.errorMessage ?? null,
    checkedAt: row.checkedAt.toISOString(),
  })) as ProviderHealthRecord[];
}
