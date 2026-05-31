import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBeastModeExportPack,
  createBeastModeGeneration,
  planBeastModeBatchRenders,
  routeBeastModeModel,
} from "./modules/marketing/beast-mode";

const repoRoot = path.resolve(import.meta.dirname, "..");

function read(file: string) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

const campaign = {
  id: 42,
  tenantId: "global",
  workspaceId: "default",
  hostAppId: "equiprofile",
  name: "Stable owner signup sprint",
  goal: "more stable-owner signups",
  audience: "stable owners",
  channels: ["Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube", "Email", "Blog / SEO"],
  startDate: "2026-05-30",
  durationDays: 7,
} as const;

const brandKit = {
  id: 7,
  brandName: "EquiProfile",
  domain: "equiprofile.com",
  toneOfVoice: "helpful and confident",
  primaryColor: "#14532d",
  secondaryColor: "#f59e0b",
  logoUrl: "https://example.com/logo.png",
  overlayTemplate: "social_reel",
  tagline: "Turn equestrian interest into booked demos",
  primaryCta: "Sign up today",
} as any;

describe("PR51 Beast Mode", () => {
  it("ships the dedicated Beast Mode module files", () => {
    const dir = path.join(repoRoot, "server/modules/marketing/beast-mode");
    for (const file of [
      "index.ts",
      "beastModeTypes.ts",
      "beastModeBriefBuilder.ts",
      "beastModeVariantPlanner.ts",
      "beastModeCopyGenerator.ts",
      "beastModeMultilingualService.ts",
      "beastModeBatchRenderPlanner.ts",
      "beastModeModelRouter.ts",
      "beastModeCostPolicy.ts",
      "beastModeQualityRules.ts",
      "beastModeStore.ts",
    ]) {
      expect(fs.existsSync(path.join(dir, file))).toBe(true);
    }
  });

  it("adds Beast Mode schema and startup safety-net migrations", () => {
    const schema = read("drizzle/schema.ts");
    const dbSource = read("server/db.ts");
    expect(schema).toContain('marketingBeastModeRuns = mysqlTable("marketingBeastModeRuns"');
    expect(schema).toContain('marketingBeastModeVariants = mysqlTable("marketingBeastModeVariants"');
    expect(schema).toContain('reviewStatus: varchar("reviewStatus", { length: 30 }).notNull().default("needs_review")');
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS \\`marketingBeastModeRuns\\`");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS \\`marketingBeastModeVariants\\`");
    expect(dbSource).toContain("ALTER TABLE \\`marketingBeastModeRuns\\` ADD COLUMN IF NOT EXISTS \\`hostAppId\\`");
    expect(dbSource).toContain("ALTER TABLE \\`marketingBeastModeVariants\\` ADD COLUMN IF NOT EXISTS \\`reviewStatus\\`");
  });

  it("routes Standard to cheaper providers and Elite to premium GenX when capable", () => {
    const standard = routeBeastModeModel({ task: "copywriting", mode: "standard" });
    const elite = routeBeastModeModel({ task: "strategy", mode: "elite" });
    expect(standard.provider).toBe("qwen");
    expect(standard.estimatedCostTier).toBe("medium");
    expect(elite.provider).toBe("genx");
    expect(elite.model).toBe("genx-premium-strategy");
  });

  it("returns provider_unavailable and setup_needed gracefully", () => {
    const unavailable = routeBeastModeModel({
      task: "scene_planning",
      mode: "elite",
      providerHealthRegistry: [
        { provider: "genx", available: false, configured: true },
        { provider: "huggingface", available: false, configured: true },
        { provider: "qwen", available: false, configured: true },
      ],
    });
    const setupNeeded = routeBeastModeModel({
      task: "translation",
      mode: "standard",
      providerHealthRegistry: [
        { provider: "genx", available: false, configured: false },
        { provider: "huggingface", available: false, configured: false },
        { provider: "qwen", available: false, configured: false },
      ],
    });
    expect(unavailable.status).toBe("provider_unavailable");
    expect(setupNeeded.status).toBe("setup_needed");
  });

  it("generates multiple platform-specific Beast Mode variants with Studio plans for video", async () => {
    const result = await createBeastModeGeneration({
      campaign,
      brandKit,
      mode: "standard",
      requestedVariantCount: 8,
      requestedPlatforms: ["Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube", "Email", "Blog / SEO"],
      requestedLanguages: ["English", "French"],
    });
    expect(result.variants).toHaveLength(8);
    expect(new Set(result.variants.map((variant) => variant.platform)).size).toBeGreaterThan(3);
    for (const variant of result.variants) {
      expect(variant.platform).toBeTruthy();
      expect(variant.contentType).toBeTruthy();
      expect(variant.hook).toBeTruthy();
      expect(variant.body).toBeTruthy();
      expect(variant.cta).toBeTruthy();
      expect(`${variant.hook} ${variant.body} ${variant.cta}`).not.toContain("Manual posting copy");
    }
    const videoVariants = result.variants.filter((variant) => variant.studioPlan);
    expect(videoVariants.length).toBeGreaterThan(0);
    expect(videoVariants.every((variant) => variant.studioPlan?.renderMode === "assembled_video")).toBe(true);
  });

  it("preserves brand names in multilingual variants", async () => {
    const result = await createBeastModeGeneration({
      campaign,
      brandKit,
      mode: "elite",
      requestedVariantCount: 3,
      requestedPlatforms: ["Facebook", "Instagram", "Email"],
      requestedLanguages: ["English", "French", "German"],
    });
    const translated = result.variants.filter((variant) => variant.language !== "English");
    expect(translated.length).toBeGreaterThan(0);
    for (const variant of translated) {
      expect(variant.hook).toContain("EquiProfile");
      expect(variant.body).toContain("EquiProfile");
    }
  });

  it("caps Beast Mode batch render planning", () => {
    const queue = planBeastModeBatchRenders({
      requested: true,
      maxRenderJobs: 2,
      variants: [
        { id: 1, contentType: "facebook_ad", platform: "Facebook", studioPlan: { renderMode: "assembled_video" }, renderJobId: null, reviewStatus: "approved", metadata: {} },
        { id: 2, contentType: "instagram_reel", platform: "Instagram", studioPlan: { renderMode: "assembled_video" }, renderJobId: null, reviewStatus: "approved", metadata: {} },
        { id: 3, contentType: "youtube_short", platform: "YouTube", studioPlan: { renderMode: "assembled_video" }, renderJobId: null, reviewStatus: "approved", metadata: {} },
      ] as any,
    });
    expect(queue.queuedCount).toBe(2);
    expect(queue.eligibleVariantIds).toEqual([1, 2]);
    expect(queue.skippedVariantIds).toEqual([3]);
  });

  it("exports Beast Mode packs with brand summary, routing summary, and review statuses", () => {
    const pack = buildBeastModeExportPack({
      run: {
        id: 1,
        tenantId: "global",
        workspaceId: "default",
        hostAppId: "equiprofile",
        campaignId: 42,
        brandKitId: 7,
        name: "Signup sprint Beast Mode",
        goal: "more stable-owner signups",
        audience: "stable owners",
        mode: "standard",
        requestedVariantCount: 2,
        requestedLanguages: ["English"],
        requestedPlatforms: ["Facebook", "Instagram"],
        status: "completed",
        plan: {},
        summary: {},
        errorMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      variants: [{
        id: 11,
        runId: 1,
        tenantId: "global",
        workspaceId: "default",
        campaignId: 42,
        campaignItemId: null,
        platform: "Facebook",
        contentType: "facebook_ad",
        language: "English",
        angle: "Facebook trust angle",
        hook: "EquiProfile helps stable owners win more signups.",
        body: "Campaign body",
        cta: "Sign up today",
        hashtags: ["#equiprofile"],
        visualPrompt: "Prompt",
        studioPlan: null,
        renderJobId: null,
        mediaAssetId: null,
        reviewStatus: "needs_review",
        exportStatus: "draft",
        metadata: { routing: { copywriting: { provider: "qwen" } }, validationIssues: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      brandSummary: { brandName: "EquiProfile", domain: "equiprofile.com" },
    });
    expect(pack.brandSummary).toMatchObject({ brandName: "EquiProfile" });
    expect(pack.modelRoutingSummary).toBeTruthy();
    expect(pack.reviewStatuses).toEqual([{ id: 11, reviewStatus: "needs_review", exportStatus: "draft" }]);
    expect(pack.markdown).toContain("## Brand summary");
    expect(pack.markdown).toContain("## Model routing summary");
    expect(pack.markdown).toContain("Review: needs_review");
  });

  it("wires Beast Mode procedures and keeps forbidden legacy paths out", () => {
    const routerSource = read("server/routers.ts");
    const beastIndex = read("server/modules/marketing/beast-mode/index.ts");
    expect(routerSource).toContain("createBeastModeRun:");
    expect(routerSource).toContain("generateBeastModeVariants:");
    expect(routerSource).toContain("createBeastModeBatchRenderJobs:");
    expect(routerSource).toContain("exportBeastModePack:");
    expect(routerSource).toContain('targetType: "beast_mode_variant"');
    expect(routerSource).toContain("createMarketingRenderJobRecord");
    expect(beastIndex).not.toContain("createMarketingDraft");
    expect(beastIndex).not.toContain("createMediaJob(");
  });

  it("exposes Beast Mode controls from Campaigns without redesign or fake posting", () => {
    const panelSource = read("client/src/components/marketing/app/MarketingAppPanels.tsx");
    const appSource = read("client/src/components/marketing/app/TheMarketingApp.tsx");
    expect(panelSource).toContain("Beast Mode");
    expect(panelSource).toContain("Generate Beast Mode variants");
    expect(panelSource).toContain("Send selected video variants to render planning");
    expect(appSource).toContain("createBeastModeRun");
    expect(appSource).toContain("exportBeastModePack");
    expect(panelSource).not.toContain("fake analytics");
    expect(panelSource).not.toContain("Post now");
  });
});
