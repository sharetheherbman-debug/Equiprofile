import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCampaignBrief, buildCampaignDeliverables, buildCampaignExportPack, toWeeklyDraftPayload } from "./modules/marketing/campaign-engine";

const root = process.cwd();

const campaignEngineFiles = [
  "server/modules/marketing/campaign-engine/index.ts",
  "server/modules/marketing/campaign-engine/campaignDeliverableTypes.ts",
  "server/modules/marketing/campaign-engine/campaignBriefBuilder.ts",
  "server/modules/marketing/campaign-engine/campaignDeliverablePlanner.ts",
  "server/modules/marketing/campaign-engine/platformContentRules.ts",
  "server/modules/marketing/campaign-engine/campaignCopyGenerator.ts",
  "server/modules/marketing/campaign-engine/campaignVideoPlanner.ts",
  "server/modules/marketing/campaign-engine/campaignExportPackBuilder.ts",
  "server/modules/marketing/campaign-engine/campaignQualityRules.ts",
];

const sampleCampaign = {
  id: 48,
  tenantId: "global",
  workspaceId: "equiprofile-global",
  hostAppId: "stablehub",
  name: "Launch Week",
  goal: "Drive signups from stable owners",
  audience: "Stable owners and trainers",
  channels: ["Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube", "Email", "Blog / SEO"],
  startDate: "2026-06-01",
  durationDays: 7,
};

const sampleBrandKit = {
  id: 3,
  tenantId: "global",
  workspaceId: "equiprofile-global",
  hostAppId: "stablehub",
  brandName: "StableHub",
  domain: "stablehub.app",
  tagline: "Grow your stable confidently",
  primaryCta: "Start your free trial",
  secondaryCta: null,
  toneOfVoice: "professional and authoritative",
  targetAudience: "Stable operators",
  primaryColor: "#1f2937",
  secondaryColor: "#0ea5e9",
  accentColor: null,
  logoAssetId: null,
  logoUrl: null,
  faviconUrl: null,
  overlayTemplate: "social_reel" as const,
  defaultAspectRatio: "16:9",
  safeArea: null,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("PR48 campaign deliverable engine", () => {
  it("includes dedicated campaign-engine module files", () => {
    for (const file of campaignEngineFiles) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
  });

  it("builds campaign brief with brand context and deterministic defaults", () => {
    const brief = buildCampaignBrief({ campaign: sampleCampaign, brandKit: sampleBrandKit });
    expect(brief.brandContext.brandName).toBe("StableHub");
    expect(brief.brandContext.domain).toBe("stablehub.app");
    expect(brief.primaryCta).toBe("Start your free trial");
    expect(brief.contentPillars.length).toBeGreaterThan(0);
  });

  it("generates platform-specific deliverables with no manual placeholder copy", async () => {
    const brief = buildCampaignBrief({ campaign: sampleCampaign, brandKit: sampleBrandKit });
    const deliverables = await buildCampaignDeliverables(brief);
    expect(deliverables).toHaveLength(7);
    for (const item of deliverables) {
      expect(item.body.toLowerCase()).not.toContain("manual posting copy");
      expect(item.body.trim().length).toBeGreaterThan(10);
      expect(item.status).toBe("export_only");
    }
    const uniquePlatforms = new Set(deliverables.map((item) => item.platform));
    expect(uniquePlatforms.size).toBe(7);
  });

  it("creates required platform details for facebook, short video, linkedin, youtube, email and blog", async () => {
    const brief = buildCampaignBrief({ campaign: sampleCampaign, brandKit: sampleBrandKit });
    const deliverables = await buildCampaignDeliverables(brief);

    const facebook = deliverables.find((item) => item.platform === "Facebook");
    expect(facebook?.hook).toBeTruthy();
    expect(facebook?.cta).toBeTruthy();
    expect(facebook?.body).toBeTruthy();

    const instagram = deliverables.find((item) => item.platform === "Instagram");
    const tiktok = deliverables.find((item) => item.platform === "TikTok");
    expect(instagram?.metadata.contentType).toBe("instagram_reel");
    expect(tiktok?.metadata.contentType).toBe("tiktok_video");

    const linkedIn = deliverables.find((item) => item.platform === "LinkedIn");
    expect(linkedIn?.body).toContain("Leaders");

    const youtube = deliverables.find((item) => item.platform === "YouTube");
    expect(youtube?.metadata.videoPlan?.scenePlanSummary?.length).toBeGreaterThan(0);

    const email = deliverables.find((item) => item.platform === "Email");
    expect(email?.title).toBeTruthy();
    expect(email?.body).toContain("Subject:");
    expect(email?.cta).toBeTruthy();

    const blog = deliverables.find((item) => item.platform === "Blog / SEO");
    expect(blog?.body).toContain("Meta description");
  });

  it("builds meaningful weekly schedule payload and export pack with QA + markdown", async () => {
    const brief = buildCampaignBrief({ campaign: sampleCampaign, brandKit: sampleBrandKit });
    const deliverables = await buildCampaignDeliverables(brief);
    const weekly = toWeeklyDraftPayload({
      campaignId: sampleCampaign.id,
      tenantId: sampleCampaign.tenantId,
      workspaceId: sampleCampaign.workspaceId,
      items: deliverables.map((item, index) => ({
        id: index + 1,
        platform: item.platform,
        title: item.title,
        content: item.body,
        scheduledFor: item.scheduledFor,
        status: item.status,
        metadata: {
          hook: item.hook,
          cta: item.cta,
          hashtags: item.hashtags,
          recommendedAssetType: item.recommendedAssetType,
        },
      })),
    });
    expect(weekly.every((draft) => draft.content.includes("Hook:"))).toBe(true);

    const pack = buildCampaignExportPack({
      brief,
      deliverables,
      linkedAssets: [],
    });
    expect(pack.brandSummary.brandName).toBe("StableHub");
    expect(pack.qaChecklist.length).toBeGreaterThan(0);
    expect(pack.markdown).toContain("## QA checklist");
  });

  it("keeps campaign engine isolated from legacy draft/raw media APIs", () => {
    const campaignEngineSource = campaignEngineFiles
      .map((file) => readFileSync(resolve(root, file), "utf8"))
      .join("\n");
    expect(campaignEngineSource).not.toContain("createMarketingDraft");
    expect(campaignEngineSource).not.toContain("createMediaJob");
  });

  it("uses persisted brand kit backend in top-level app brand tab", () => {
    const appSource = readFileSync(resolve(root, "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
    const hookSource = readFileSync(resolve(root, "client/src/components/marketing/app/hooks/useMarketingBrandKit.ts"), "utf8");
    const studioSource = readFileSync(resolve(root, "client/src/components/marketing/app/studio/StudioWorkbench.tsx"), "utf8");

    expect(appSource).toContain("useMarketingBrandKit");
    expect(hookSource).toContain("trpc.admin.getMarketingBrandKit.useQuery");
    expect(hookSource).toContain("trpc.admin.upsertMarketingBrandKit.useMutation");
    expect(hookSource).toContain("trpc.admin.selectMarketingBrandLogoAsset.useMutation");
    expect(hookSource).toContain("trpc.admin.listMarketingBrandOverlayTemplates.useQuery");
    expect(appSource).not.toContain("localStorage");

    expect(studioSource).toContain("getMarketingBrandKit.useQuery");
    expect(studioSource).toContain("upsertMarketingBrandKit.useMutation");
  });
});
