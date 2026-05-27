import { beforeEach, describe, expect, it, vi } from "vitest";

const dbState = vi.hoisted(() => ({
  row: {
    id: 42,
    queueType: "media",
    status: "queued",
    task: "text_to_video",
    provider: "genx",
    tenantId: "global",
    createdByUserId: 9,
    errorMessage: null,
    metadataJson: JSON.stringify({ lifecycle: { jobId: "42", state: "queued", startedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } }),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    completedAt: null,
  },
  updatedPayload: null as any,
}));

const mocks = vi.hoisted(() => ({
  publishModuleEvent: vi.fn(),
  getMediaAssetById: vi.fn(),
  getMediaAssetByJobId: vi.fn(),
  updateMediaAsset: vi.fn(),
}));

vi.mock("../../db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [dbState.row],
        }),
      }),
    }),
    update: () => ({
      set: (payload: any) => {
        dbState.updatedPayload = payload;
        return {
          where: async () => true,
        };
      },
    }),
  }),
}));

vi.mock("../realtime", () => ({
  publishModuleEvent: mocks.publishModuleEvent,
}));

vi.mock("../../modules/growth-engine/mediaAssets", () => ({
  getMediaAssetById: mocks.getMediaAssetById,
  getMediaAssetByJobId: mocks.getMediaAssetByJobId,
  updateMediaAsset: mocks.updateMediaAsset,
}));

import { getGenerationLifecycleByJobId, updateGenerationLifecycle } from "./generationLifecycle";

describe("generationLifecycle", () => {
  beforeEach(() => {
    dbState.updatedPayload = null;
    dbState.row.status = "queued";
    dbState.row.metadataJson = JSON.stringify({ lifecycle: { jobId: "42", state: "queued", startedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } });
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getMediaAssetByJobId.mockResolvedValue({ id: 77, outputMetadata: {} });
  });

  it("loads lifecycle snapshot from metadata", async () => {
    const snapshot = await getGenerationLifecycleByJobId("42");
    expect(snapshot?.state).toBe("queued");
    expect(snapshot?.jobId).toBe("42");
  });

  it("applies valid transition and publishes SSE event", async () => {
    const snapshot = await updateGenerationLifecycle({
      jobId: "42",
      state: "preparing",
      initiatedByUserId: 9,
      progressPercent: 12,
    });

    expect(snapshot.state).toBe("preparing");
    expect(snapshot.progressPercent).toBe(12);
    expect(dbState.updatedPayload.status).toBe("preparing");
    expect(mocks.publishModuleEvent).toHaveBeenCalledWith("generation", "updated", expect.objectContaining({ state: "preparing" }), 9);
    expect(mocks.updateMediaAsset).toHaveBeenCalled();
  });

  it("rejects invalid transitions", async () => {
    await expect(updateGenerationLifecycle({ jobId: "42", state: "completed" })).rejects.toThrow(/Invalid lifecycle transition/);
  });
});
