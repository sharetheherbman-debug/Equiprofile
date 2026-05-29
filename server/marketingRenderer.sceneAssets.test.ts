import os from "node:os";
import { describe, expect, it } from "vitest";
import { buildSceneSegmentCommand } from "./modules/marketing/media-factory/marketingRenderer";

const overlay = {
  brandName: "EquiProfile",
  domain: "equiprofile.com",
  cta: "Start today",
  primaryColor: "#1e3a5f",
  secondaryColor: "#c5a55a",
};

describe("PR44 renderer scene asset commands", () => {
  it("uses image assetUrl for image scene segment", () => {
    const scene = {
      id: "s1",
      order: 1,
      durationSeconds: 5,
      sourceType: "stock" as const,
      mediaKind: "image" as const,
      assetId: null,
      assetUrl: "https://images.pexels.com/photos/123/horse.jpg",
      previewUrl: null,
      provider: "pexels",
      providerAssetId: "1",
      textCard: "horse",
      narration: "horse",
      visualPrompt: "horse",
      caption: "horse",
      metadata: { requiredSubject: "horse", negativePrompt: "", sourceMetadata: null, selectedAt: null, selectionReason: null, status: "ready" as const },
    };
    const command = buildSceneSegmentCommand({
      ffmpegPath: "/usr/bin/ffmpeg",
      tmpDir: os.tmpdir(),
      scene,
      sceneIndex: 0,
      totalScenes: 3,
      overlay,
    });
    expect(command.args).toContain("-loop");
    expect(command.args).toContain("1");
    expect(command.args).toContain(scene.assetUrl);
  });

  it("uses video assetUrl for video scene segment", () => {
    const scene = {
      id: "s2",
      order: 2,
      durationSeconds: 4,
      sourceType: "stock" as const,
      mediaKind: "video" as const,
      assetId: null,
      assetUrl: "/tmp/input/horse.mp4",
      previewUrl: null,
      provider: "pixabay",
      providerAssetId: "2",
      textCard: "horse",
      narration: "horse",
      visualPrompt: "horse",
      caption: "horse",
      metadata: { requiredSubject: "horse", negativePrompt: "", sourceMetadata: null, selectedAt: null, selectionReason: null, status: "ready" as const },
    };
    const command = buildSceneSegmentCommand({
      ffmpegPath: "/usr/bin/ffmpeg",
      tmpDir: os.tmpdir(),
      scene,
      sceneIndex: 1,
      totalScenes: 3,
      overlay,
    });
    expect(command.args).toContain(scene.assetUrl);
    expect(command.args).toContain("-stream_loop");
  });

  it("falls back to text-card segment command and includes brand/domain/CTA overlay", () => {
    const scene = {
      id: "s3",
      order: 3,
      durationSeconds: 4,
      sourceType: "text_card" as const,
      mediaKind: "text_card" as const,
      assetId: null,
      assetUrl: null,
      previewUrl: null,
      provider: null,
      providerAssetId: null,
      textCard: "Final CTA",
      narration: "Final CTA",
      visualPrompt: "Final CTA",
      caption: "Final CTA",
      metadata: { requiredSubject: "cta", negativePrompt: "", sourceMetadata: null, selectedAt: null, selectionReason: null, status: "needs_review" as const },
    };
    const command = buildSceneSegmentCommand({
      ffmpegPath: "/usr/bin/ffmpeg",
      tmpDir: os.tmpdir(),
      scene,
      sceneIndex: 2,
      totalScenes: 3,
      overlay,
    });
    const vf = String(command.args[command.args.indexOf("-vf") + 1] ?? "");
    expect(command.args).toContain("lavfi");
    expect(vf).toContain("EquiProfile");
    expect(vf).toContain("equiprofile.com");
    expect(vf).toContain("CTA");
  });

  it("rejects disallowed remote media hosts and uses text-card command", () => {
    const scene = {
      id: "s4",
      order: 1,
      durationSeconds: 5,
      sourceType: "stock" as const,
      mediaKind: "video" as const,
      assetId: null,
      assetUrl: "https://example.org/not-stock.mp4",
      previewUrl: null,
      provider: "pexels",
      providerAssetId: "blocked",
      textCard: "fallback",
      narration: "fallback",
      visualPrompt: "fallback",
      caption: "fallback",
      metadata: { requiredSubject: "horse", negativePrompt: "", sourceMetadata: null, selectedAt: null, selectionReason: null, status: "needs_review" as const },
    };
    const command = buildSceneSegmentCommand({
      ffmpegPath: "/usr/bin/ffmpeg",
      tmpDir: os.tmpdir(),
      scene,
      sceneIndex: 0,
      totalScenes: 1,
      overlay,
    });
    expect(command.args).not.toContain(scene.assetUrl);
    expect(command.args).toContain("lavfi");
  });
});
