import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPendingMediaAssets: vi.fn(),
  updateMediaAsset: vi.fn(),
  writeGeneratedAsset: vi.fn(),
  resolveGenXConfig: vi.fn(),
  pollGenXMediaJob: vi.fn(),
  updateGenerationLifecycle: vi.fn(),
}));

vi.mock("../../modules/growth-engine/mediaAssets", () => ({
  listPendingMediaAssets: mocks.listPendingMediaAssets,
  updateMediaAsset: mocks.updateMediaAsset,
}));

vi.mock("../storage/localMediaStorage", () => ({
  writeGeneratedAsset: mocks.writeGeneratedAsset,
}));

vi.mock("./providers/genxProvider", () => ({
  resolveGenXConfig: mocks.resolveGenXConfig,
  pollGenXMediaJob: mocks.pollGenXMediaJob,
}));

vi.mock("./generationLifecycle", () => ({
  updateGenerationLifecycle: mocks.updateGenerationLifecycle,
}));

import { resolveGenXMediaAssetById } from "./mediaResolver";

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    jobId: "local-job-1",
    task: "text_to_video",
    provider: "genx",
    status: "processing",
    outputMetadata: { providerJobId: "genx-job-1", source: "app_genx_media_job" },
    ...overrides,
  };
}

describe("mediaResolver", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    vi.unstubAllGlobals();
    mocks.resolveGenXConfig.mockResolvedValue({ key: "genx-key", base: "https://query.genx.sh/v1" });
    mocks.pollGenXMediaJob.mockResolvedValue({ status: "pending", diagnostics: "still pending" });
    mocks.updateGenerationLifecycle.mockResolvedValue({});
  });

  it("marks provider failed jobs as failed", async () => {
    mocks.listPendingMediaAssets.mockResolvedValue([asset()]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "failed", error: "provider error" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })));

    const result = await resolveGenXMediaAssetById(7);

    expect(result.status).toBe("failed");
    expect(mocks.updateMediaAsset).toHaveBeenCalledWith(7, expect.objectContaining({
      status: "failed",
      errorMessage: "provider error",
      outputMetadata: expect.objectContaining({ providerStatus: "failed" }),
    }));
  });

  it("marks text/plain completed outputs as failed video_plan", async () => {
    mocks.listPendingMediaAssets.mockResolvedValue([asset()]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      status: "completed",
      result_url: "data:text/plain;charset=utf-8,Storyboard only",
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })));

    await resolveGenXMediaAssetById(7);

    expect(mocks.updateMediaAsset).toHaveBeenCalledWith(7, expect.objectContaining({
      status: "failed",
      errorMessage: "Provider returned text/plain planning output, not playable media.",
      mimeType: "text/plain",
      outputMetadata: expect.objectContaining({
        resultType: "video_plan",
        providerStatus: "completed",
      }),
    }));
  });

  it("fetches completed GenX job files and stores playable media", async () => {
    mocks.listPendingMediaAssets.mockResolvedValue([asset()]);
    mocks.writeGeneratedAsset.mockResolvedValue({
      localPath: "/var/equiprofile/storage/videos/job_local.mp4",
      publicUrl: "/media/generated/videos/job_local.mp4",
      fileSizeBytes: 4,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "completed",
        result_url: "/api/v1/jobs/genx-job-1/file",
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(Buffer.from("video"), {
        status: 200,
        headers: { "content-type": "video/mp4" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveGenXMediaAssetById(7);

    expect(result).toMatchObject({ status: "completed", publicUrl: "/media/generated/videos/job_local.mp4", mimeType: "video/mp4" });
    expect(fetchMock.mock.calls[1][0]).toBe("https://query.genx.sh/api/v1/jobs/genx-job-1/file");
    expect(mocks.updateMediaAsset).toHaveBeenCalledWith(7, expect.objectContaining({
      status: "completed",
      publicUrl: "/media/generated/videos/job_local.mp4",
      mimeType: "video/mp4",
      errorMessage: null,
    }));
  });
});
