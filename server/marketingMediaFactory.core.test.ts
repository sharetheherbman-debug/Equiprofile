import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildMarketingBrandOverlay } from "./modules/marketing/media-factory/marketingBrandOverlayService";
import { generateSrtCaptions, generateVttCaptions } from "./modules/marketing/media-factory/marketingCaptionService";
import { compileMarketingTimeline } from "./modules/marketing/media-factory/marketingTimelineCompiler";

describe("PR43 media factory core", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("includes required media factory dependencies", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };

    const deps = pkg.dependencies ?? {};
    for (const dep of [
      "remotion",
      "@remotion/player",
      "ffmpeg-static",
      "execa",
      "bullmq",
      "ioredis",
      "subtitle",
      "sharp",
      "@huggingface/inference",
    ]) {
      expect(deps[dep], `${dep} missing`).toBeDefined();
    }
  });

  it("creates required media-factory module files", () => {
    const root = path.join(process.cwd(), "server/modules/marketing/media-factory");
    for (const file of [
      "index.ts",
      "renderJobTypes.ts",
      "marketingRenderJobStore.ts",
      "marketingTimelineCompiler.ts",
      "marketingCaptionService.ts",
      "marketingBrandOverlayService.ts",
      "marketingRenderer.ts",
      "marketingRenderWorker.ts",
      "marketingRenderQueue.ts",
    ]) {
      expect(fs.existsSync(path.join(root, file)), `${file} must exist`).toBe(true);
    }
  });

  it("compiles 3 scenes into timeline and calculates total duration", () => {
    const timeline = compileMarketingTimeline({
      script: "Stable growth video",
      scenes: [
        {
          id: "a",
          order: 1,
          durationSeconds: 4,
          narration: "Scene one",
          visualPrompt: "https://cdn.example.com/scene1.mp4",
          negativePrompt: "",
          sourceType: "stock",
          requiredSubject: "stable",
          assetId: null,
          status: "ready",
        },
        {
          id: "b",
          order: 2,
          durationSeconds: 5,
          narration: "Scene two",
          visualPrompt: "Horse care",
          negativePrompt: "",
          sourceType: "text_card",
          requiredSubject: "horse",
          assetId: null,
          status: "ready",
        },
        {
          id: "c",
          order: 3,
          durationSeconds: 6,
          narration: "Scene three",
          visualPrompt: "Final CTA",
          negativePrompt: "",
          sourceType: "generated",
          requiredSubject: "cta",
          assetId: 12,
          status: "ready",
        },
      ],
    });

    expect(timeline.scenes).toHaveLength(3);
    expect(timeline.totalDurationSeconds).toBe(15);
    expect(timeline.scenes[0].assetUrl).toContain("https://cdn.example.com");
    expect(timeline.scenes[2].assetUrl).toContain("/media/generated/assets/12");
  });

  it("creates SRT and VTT captions from narration", () => {
    const timeline = compileMarketingTimeline({
      script: "",
      scenes: [
        {
          id: "a",
          order: 1,
          durationSeconds: 3,
          narration: "Hello stable owners",
          visualPrompt: "",
          negativePrompt: "",
          sourceType: "text_card",
          requiredSubject: "",
          assetId: null,
          status: "ready",
        },
      ],
    });

    const srt = generateSrtCaptions(timeline);
    const vtt = generateVttCaptions(timeline);

    expect(srt).toContain("1");
    expect(srt).toContain("Hello stable owners");
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("Hello stable owners");
  });

  it("creates brand overlay defaults", async () => {
    const overlay = await buildMarketingBrandOverlay({
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
    });

    expect(overlay.brandName).toBeTruthy();
    expect(overlay.domain).toBeTruthy();
    expect(overlay.primaryColor).toBeTruthy();
    expect(overlay.secondaryColor).toBeTruthy();
  });

  it("renderer returns playable mp4 output in test mode", async () => {
    const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "equiprofile-render-"));
    process.env.EQUIPROFILE_STORAGE_ROOT = storageRoot;

    const renderer = await import("./modules/marketing/media-factory/marketingRenderer");
    const rendered = await renderer.renderMarketingTimeline({
      jobId: "job_1",
      testMode: true,
      brandOverlay: {
        brandName: "EquiProfile",
        domain: "equiprofile.com",
        cta: "Start today",
        primaryColor: "#1e3a5f",
        secondaryColor: "#c5a55a",
      },
      timeline: {
        scenes: [],
        totalDurationSeconds: 1,
        captionLines: [],
      },
    });

    expect(rendered.status).toBe("completed");
    if (rendered.status !== "completed") return;
    expect(rendered.output.mimeType).toBe("video/mp4");
    expect(rendered.output.filePath.endsWith(".mp4")).toBe(true);
    const data = fs.readFileSync(rendered.output.filePath);
    expect(data.toString("latin1", 4, 8)).toBe("ftyp");
  });
});
