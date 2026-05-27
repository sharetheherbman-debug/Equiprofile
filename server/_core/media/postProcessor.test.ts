import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const mocks = vi.hoisted(() => ({
  getMediaAssetById: vi.fn(),
  createMediaAsset: vi.fn(),
  updateMediaAsset: vi.fn(),
}));

vi.mock("../../modules/growth-engine/mediaAssets", () => ({
  getMediaAssetById: mocks.getMediaAssetById,
  createMediaAsset: mocks.createMediaAsset,
  updateMediaAsset: mocks.updateMediaAsset,
}));

import { createBrandedMediaDerivative } from "./postProcessor";

describe("postProcessor", () => {
  beforeEach(() => {
    mocks.getMediaAssetById.mockReset();
    mocks.createMediaAsset.mockReset();
    mocks.updateMediaAsset.mockReset();
  });

  it("creates branded asset metadata linked to raw asset", async () => {
    const root = "/tmp/equiprofile-postprocessor-test";
    mkdirSync(root, { recursive: true });
    const rawPath = join(root, "raw.mp4");
    writeFileSync(rawPath, "raw-video");
    mocks.getMediaAssetById.mockResolvedValue({
      id: 10,
      tenantType: "stable",
      tenantId: "global",
      userId: 1,
      type: "video",
      task: "text_to_video",
      mimeType: "video/mp4",
      localPath: rawPath,
      outputMetadata: {},
    });
    mocks.createMediaAsset.mockResolvedValue({ id: 11 });

    const result = await createBrandedMediaDerivative(10, { domainText: "equiprofile.com" }, {
      runFfmpeg: vi.fn(async (args: string[]) => {
        const outputPath = args[args.length - 1];
        writeFileSync(outputPath, "branded-video");
      }),
    });

    expect(result.rawAssetId).toBe(10);
    expect(result.brandedAssetId).toBe(11);
    expect(mocks.createMediaAsset).toHaveBeenCalledWith(expect.objectContaining({
      outputMetadata: expect.objectContaining({
        rawAssetId: 10,
      }),
    }));
    expect(mocks.updateMediaAsset).toHaveBeenCalledWith(10, expect.objectContaining({
      outputMetadata: expect.objectContaining({
        brandedAssetId: 11,
      }),
    }));
  });

  it("never overwrites the raw media file", async () => {
    const root = "/tmp/equiprofile-postprocessor-test";
    mkdirSync(root, { recursive: true });
    const rawPath = join(root, "raw-original.mp4");
    writeFileSync(rawPath, "raw-video");
    mocks.getMediaAssetById.mockResolvedValue({
      id: 20,
      tenantType: "stable",
      tenantId: "global",
      type: "video",
      localPath: rawPath,
      outputMetadata: {},
    });
    mocks.createMediaAsset.mockResolvedValue({ id: 21 });
    const ffmpegSpy = vi.fn(async (args: string[]) => {
      const outputPath = args[args.length - 1];
      expect(outputPath).not.toBe(rawPath);
      writeFileSync(outputPath, "branded-video");
    });

    await createBrandedMediaDerivative(20, { watermarkText: "EquiProfile" }, { runFfmpeg: ffmpegSpy });

    expect(ffmpegSpy).toHaveBeenCalledOnce();
  });
});
