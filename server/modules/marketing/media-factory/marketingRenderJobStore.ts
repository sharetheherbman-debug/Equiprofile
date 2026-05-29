import { and, desc, eq } from "drizzle-orm";
import { marketingRenderJobs } from "../../../../drizzle/schema";
import type { MarketingRenderJob, MarketingTimeline, MarketingBrandOverlay, RenderJobStatus } from "./renderJobTypes";

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

function mapRow(row: typeof marketingRenderJobs.$inferSelect): MarketingRenderJob {
  return {
    id: String(row.id),
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    hostAppId: row.hostAppId,
    planId: row.planId,
    campaignId: row.campaignId,
    campaignItemId: row.campaignItemId,
    status: row.status as RenderJobStatus,
    contentType: row.contentType as MarketingRenderJob["contentType"],
    originalUserPrompt: row.originalUserPrompt,
    renderMode: row.renderMode as MarketingRenderJob["renderMode"],
    durationTargetSeconds: row.durationTargetSeconds,
    timeline: parseJson<MarketingTimeline>(row.timelineJson, { scenes: [], totalDurationSeconds: 0, captionLines: [] }),
    captions: parseJson<MarketingRenderJob["captions"]>(row.captionJson, {
      mode: "script",
      format: "srt",
      srt: "",
      vtt: "",
      text: "",
      status: "pending",
    }),
    audio: parseJson<MarketingRenderJob["audio"]>(row.audioJson, {
      status: "pending",
      voiceAssetId: row.voiceAssetId ?? null,
      audioUrl: null,
      backgroundMusicUrl: null,
      voiceProvider: null,
      voiceModel: null,
    }),
    brandOverlay: parseJson<MarketingBrandOverlay>(row.brandOverlayJson, {
      brandName: "EquiProfile",
      domain: "equiprofile.com",
      cta: "Start today",
      primaryColor: "#1e3a5f",
      secondaryColor: "#c5a55a",
    }),
    outputMediaAssetId: row.outputMediaAssetId,
    outputPublicUrl: row.outputPublicUrl,
    warnings: parseJson<string[]>(row.warningsJson, []),
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function createMarketingRenderJobRecord(input: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  planId?: string | null;
  campaignId?: number | null;
  campaignItemId?: number | null;
  status: RenderJobStatus;
  contentType: string;
  originalUserPrompt: string;
  renderMode: string;
  durationTargetSeconds: number;
  timeline: MarketingTimeline;
  captions: MarketingRenderJob["captions"];
  audio: MarketingRenderJob["audio"];
  brandOverlay: MarketingBrandOverlay;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketing render jobs");

  const result = await db.insert(marketingRenderJobs).values({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostAppId: input.hostAppId,
    planId: input.planId ?? null,
    campaignId: input.campaignId ?? null,
    campaignItemId: input.campaignItemId ?? null,
    status: input.status,
    contentType: input.contentType,
    originalUserPrompt: input.originalUserPrompt,
    renderMode: input.renderMode,
    durationTargetSeconds: input.durationTargetSeconds,
    timelineJson: JSON.stringify(input.timeline),
    captionJson: JSON.stringify(input.captions),
    audioJson: JSON.stringify(input.audio),
    voiceAssetId: input.audio.voiceAssetId,
    brandOverlayJson: JSON.stringify(input.brandOverlay),
  });

  const id = result[0].insertId;
  const record = await getMarketingRenderJobById(String(id));
  if (!record) throw new Error("Failed to create marketing render job");
  return record;
}

export async function getMarketingRenderJobById(id: string) {
  const db = await resolveDb();
  if (!db) return null;

  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) return null;

  const [row] = await db
    .select()
    .from(marketingRenderJobs)
    .where(eq(marketingRenderJobs.id, idNum))
    .limit(1);

  return row ? mapRow(row) : null;
}

export async function listMarketingRenderJobsByScope(input: { tenantId: string; workspaceId: string; limit?: number }) {
  const db = await resolveDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(marketingRenderJobs)
    .where(and(eq(marketingRenderJobs.tenantId, input.tenantId), eq(marketingRenderJobs.workspaceId, input.workspaceId)))
    .orderBy(desc(marketingRenderJobs.createdAt))
    .limit(input.limit ?? 100);

  return rows.map(mapRow);
}

export async function updateMarketingRenderJobRecord(input: {
  id: string;
  status?: RenderJobStatus;
  timeline?: MarketingTimeline;
  captions?: MarketingRenderJob["captions"];
  audio?: MarketingRenderJob["audio"];
  brandOverlay?: MarketingBrandOverlay;
  voiceAssetId?: number | null;
  outputMediaAssetId?: number | null;
  outputPublicUrl?: string | null;
  errorMessage?: string | null;
  warnings?: string[];
  completedAt?: Date | null;
}) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketing render jobs");

  const idNum = Number(input.id);
  if (!Number.isFinite(idNum) || idNum <= 0) throw new Error("Invalid marketing render job id");

  await db
    .update(marketingRenderJobs)
    .set({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.timeline !== undefined ? { timelineJson: JSON.stringify(input.timeline) } : {}),
      ...(input.captions !== undefined ? { captionJson: JSON.stringify(input.captions) } : {}),
      ...(input.audio !== undefined ? { audioJson: JSON.stringify(input.audio) } : {}),
      ...(input.voiceAssetId !== undefined ? { voiceAssetId: input.voiceAssetId } : {}),
      ...(input.brandOverlay !== undefined ? { brandOverlayJson: JSON.stringify(input.brandOverlay) } : {}),
      ...(input.outputMediaAssetId !== undefined ? { outputMediaAssetId: input.outputMediaAssetId } : {}),
      ...(input.outputPublicUrl !== undefined ? { outputPublicUrl: input.outputPublicUrl } : {}),
      ...(input.warnings !== undefined ? { warningsJson: JSON.stringify(input.warnings) } : {}),
      ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
      ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
      updatedAt: new Date(),
    })
    .where(eq(marketingRenderJobs.id, idNum));

  const row = await getMarketingRenderJobById(input.id);
  if (!row) throw new Error("Marketing render job not found after update");
  return row;
}

export async function cancelMarketingRenderJobRecord(input: { id: string; tenantId: string; workspaceId: string }) {
  const db = await resolveDb();
  if (!db) throw new Error("Database unavailable for marketing render jobs");

  const idNum = Number(input.id);
  if (!Number.isFinite(idNum) || idNum <= 0) throw new Error("Invalid marketing render job id");

  const [row] = await db
    .select()
    .from(marketingRenderJobs)
    .where(
      and(
        eq(marketingRenderJobs.id, idNum),
        eq(marketingRenderJobs.tenantId, input.tenantId),
        eq(marketingRenderJobs.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  if (!row) return null;
  const status = row.status as RenderJobStatus;
  if (status === "completed" || status === "failed" || status === "cancelled") {
    return mapRow(row);
  }

  await db
    .update(marketingRenderJobs)
    .set({ status: "cancelled", updatedAt: new Date(), completedAt: new Date() })
    .where(eq(marketingRenderJobs.id, idNum));

  const updated = await getMarketingRenderJobById(input.id);
  return updated;
}
