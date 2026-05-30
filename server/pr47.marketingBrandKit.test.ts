import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { listMarketingBrandOverlayTemplates, selectMarketingBrandLogoAsset } from "./modules/marketing/brand-kit";

vi.mock("./modules/growth-engine", () => ({
  getMediaAssetById: vi.fn(async (id: number) => {
    if (id === 10) return { id: 10, type: "image", publicUrl: "https://cdn.example.com/logo.png" };
    if (id === 11) return { id: 11, type: "video", publicUrl: "https://cdn.example.com/video.mp4" };
    return null;
  }),
}));

vi.mock("./modules/marketing/brand-kit/marketingBrandKitStore", () => {
  let row: any = null;
  return {
    getMarketingBrandKitRowByScope: vi.fn(async () => row),
    getMarketingBrandKitRowById: vi.fn(async (id: number) => (row?.id === id ? row : null)),
    insertMarketingBrandKitRow: vi.fn(async (input: any) => {
      row = {
        id: 1,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        safeAreaJson: input.safeArea ? JSON.stringify(input.safeArea) : null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      };
      return 1;
    }),
    updateMarketingBrandKitRow: vi.fn(async (_id: number, input: any) => {
      row = {
        id: 1,
        ...input,
        createdAt: row?.createdAt ?? new Date(),
        updatedAt: new Date(),
        safeAreaJson: input.safeArea ? JSON.stringify(input.safeArea) : null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      };
    }),
  };
});

const root = process.cwd();
const schemaSource = fs.readFileSync(path.join(root, "drizzle/schema.ts"), "utf8");
const dbSource = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");
const routerSource = fs.readFileSync(path.join(root, "server/routers.ts"), "utf8");
const workerSource = fs.readFileSync(path.join(root, "server/modules/marketing/media-factory/marketingRenderWorker.ts"), "utf8");
const postProcessorSource = fs.readFileSync(path.join(root, "server/_core/media/postProcessor.ts"), "utf8");
const rendererSource = fs.readFileSync(path.join(root, "server/modules/marketing/media-factory/marketingRenderer.ts"), "utf8");
const workbenchSource = fs.readFileSync(path.join(root, "client/src/components/marketing/app/studio/StudioWorkbench.tsx"), "utf8");


describe("PR47 brand kit persistence and versioning", () => {
  it("adds marketingBrandKits and marketingMediaAssetVersions schema", () => {
    expect(schemaSource).toContain("marketingBrandKits");
    expect(schemaSource).toContain("overlayTemplate");
    expect(schemaSource).toContain("marketingMediaAssetVersions");
    expect(schemaSource).toContain("versionType");
  });

  it("adds startup safety-net table creation for brand kits and asset versions", () => {
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS \\`marketingBrandKits\\`");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS \\`marketingMediaAssetVersions\\`");
    expect(dbSource).toContain("ALTER TABLE \\`marketingRenderJobs\\` ADD COLUMN IF NOT EXISTS \\`brandKitId\\`");
  });

  it("registers required admin procedures for brand kit and versions", () => {
    expect(routerSource).toContain("getMarketingBrandKit: adminUnlockedProcedure");
    expect(routerSource).toContain("upsertMarketingBrandKit: adminUnlockedProcedure");
    expect(routerSource).toContain("resetMarketingBrandKitToWorkspaceDefault: adminUnlockedProcedure");
    expect(routerSource).toContain("selectMarketingBrandLogoAsset: adminUnlockedProcedure");
    expect(routerSource).toContain("listMarketingBrandOverlayTemplates: adminUnlockedProcedure");
    expect(routerSource).toContain("previewMarketingBrandOverlay: adminUnlockedProcedure");
    expect(routerSource).toContain("listMarketingAssetVersions: adminUnlockedProcedure");
  });

  it("overlay template service returns all required templates", () => {
    expect(listMarketingBrandOverlayTemplates()).toEqual([
      "lower_third",
      "corner_logo",
      "end_card",
      "social_reel",
      "youtube_landscape",
    ]);
  });

  it("selectMarketingBrandLogoAsset accepts image and rejects non-image", async () => {
    const selected = await selectMarketingBrandLogoAsset({
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
      mediaAssetId: 10,
    });
    expect(selected.logoAssetId).toBe(10);
    await expect(selectMarketingBrandLogoAsset({
      tenantId: "global",
      workspaceId: "default",
      hostAppId: "equiprofile",
      mediaAssetId: 11,
    })).rejects.toThrow("Logo asset must be an image media asset");
  });

  it("renderer attempts logo overlay and keeps fallback warning path", () => {
    expect(rendererSource).toContain("enableLogoOverlay");
    expect(rendererSource).toContain("-filter_complex");
    expect(rendererSource).toContain("logo overlay failed; rendering continued without logo");
  });

  it("render metadata and versions include brand kit and template", () => {
    expect(workerSource).toContain("brandKitId");
    expect(workerSource).toContain("overlayTemplate");
    expect(workerSource).toContain("createMarketingAssetVersionRecord");
  });

  it("branded derivatives create version records and preserve source", () => {
    expect(postProcessorSource).toContain("createMarketingAssetVersionRecord");
    expect(postProcessorSource).toContain("outputPath === rawPath");
  });

  it("frontend brand step loads/saves brand kit and passes it to render", () => {
    expect(workbenchSource).toContain("getMarketingBrandKit.useQuery");
    expect(workbenchSource).toContain("upsertMarketingBrandKit.useMutation");
    expect(workbenchSource).toContain("selectMarketingBrandLogoAsset.useMutation");
    expect(workbenchSource).toContain("createRenderJob(plan, brandKitDraft)");
  });
});
