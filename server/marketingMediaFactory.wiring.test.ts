import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const routerSource = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");
const schemaSource = fs.readFileSync(path.join(root, "drizzle/schema.ts"), "utf8");
const dbSource = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");
const renderStepSource = fs.readFileSync(path.join(root, "client/src/components/marketing/app/studio/RenderStep.tsx"), "utf8");
const mediaSelectionSource = fs.readFileSync(path.join(root, "client/src/components/marketing/app/studio/MediaSelectionStep.tsx"), "utf8");
const exportStepSource = fs.readFileSync(path.join(root, "client/src/components/marketing/app/studio/ExportStep.tsx"), "utf8");
const workbenchSource = fs.readFileSync(path.join(root, "client/src/components/marketing/app/studio/StudioWorkbench.tsx"), "utf8");
const hookSource = fs.readFileSync(path.join(root, "client/src/components/marketing/app/studio/useMarketingRenderJob.ts"), "utf8");
const sceneMediaHookSource = fs.readFileSync(path.join(root, "client/src/components/marketing/app/studio/useMarketingSceneMedia.ts"), "utf8");
const appSource = fs.readFileSync(path.join(root, "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const rendererSource = fs.readFileSync(path.join(root, "server/modules/marketing/media-factory/marketingRenderer.ts"), "utf8");

function sectionAround(source: string, marker: string, length = 1800) {
  const index = source.indexOf(marker);
  if (index < 0) return "";
  return source.slice(index, index + length);
}

describe("PR43 media factory wiring", () => {
  it("adds marketingRenderJobs schema and startup safety-net", () => {
    expect(schemaSource).toContain("marketingRenderJobs");
    expect(schemaSource).toContain("timelineJson");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS \\`marketingRenderJobs\\`");
  });

  it("adds admin procedures for render jobs and preview", () => {
    expect(routerSource).toContain("createMarketingRenderJob: adminUnlockedProcedure");
    expect(routerSource).toContain("getMarketingRenderJob: adminUnlockedProcedure");
    expect(routerSource).toContain("listMarketingRenderJobs: adminUnlockedProcedure");
    expect(routerSource).toContain("cancelMarketingRenderJob: adminUnlockedProcedure");
    expect(routerSource).toContain("renderMarketingPlanPreview: adminUnlockedProcedure");
  });

  it("ensures assembled-video render jobs do not call raw media provider", () => {
    const block = sectionAround(routerSource, "createMarketingRenderJob: adminUnlockedProcedure", 3200);
    expect(block).toContain("assembled_video");
    expect(block).not.toContain("createMediaJob(");
    expect(block).not.toContain("createMediaJob.mutate");
  });

  it("completed render writes media asset as assembled_video/media_factory", () => {
    const workerSource = fs.readFileSync(path.join(root, "server/modules/marketing/media-factory/marketingRenderWorker.ts"), "utf8");
    expect(workerSource).toContain('provider: "media_factory"');
    expect(workerSource).toContain('task: "assembled_video"');
    expect(workerSource).toContain('type: "video"');
  });

  it("render step and export step are wired for render jobs", () => {
    expect(renderStepSource).toContain("Create render job");
    expect(renderStepSource).toContain("Scenes with sourced media");
    expect(exportStepSource).toContain("Open video");
    expect(exportStepSource).toContain("Download video");
    expect(workbenchSource).toContain("useMarketingRenderJob");
    expect(hookSource).toContain("trpc.admin.createMarketingRenderJob.useMutation");
  });

  it("media selection step is wired to source scene media", () => {
    expect(mediaSelectionSource).toContain("Find scene media");
    expect(workbenchSource).toContain("useMarketingSceneMedia");
    expect(workbenchSource).toContain("sourceSceneMedia(plan)");
    expect(sceneMediaHookSource).toContain("trpc.admin.sourceMarketingSceneMedia.useMutation");
    expect(sceneMediaHookSource).toContain("scenes: plan.scenes");
  });

  it("router exposes scene sourcing and scene-level stock import procedures", () => {
    expect(routerSource).toContain("sourceMarketingSceneMedia: adminUnlockedProcedure");
    expect(routerSource).toContain("importStockMediaForScene: adminUnlockedProcedure");
    expect(routerSource).toContain("stock_media_import");
    expect(routerSource).toContain("license");
    expect(routerSource).toContain("sourceUrl");
  });

  it("renderer assembles scene segments with concat and per-scene fallback", () => {
    expect(rendererSource).toContain("buildSceneSegmentCommand");
    expect(rendererSource).toContain("\"concat\"");
    expect(rendererSource).toContain("text card fallback used");
  });

  it("TheMarketingApp remains orchestration shell without render engine code", () => {
    expect(appSource).not.toContain("ffmpeg");
    expect(appSource).not.toContain("remotion");
    expect(appSource).not.toContain("bullmq");
    expect(appSource).not.toContain("queueMedia(");
    expect(appSource).not.toContain("createMediaJob.mutate");
  });

  it("keeps free-form chat hidden and academy untouched", () => {
    expect(appSource).not.toContain("Free-form chat");
    expect(appSource).not.toContain("Academy");
  });
});
