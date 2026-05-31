import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCampaignExportPack } from "./modules/marketing/campaign-engine/campaignExportPackBuilder";
import { buildBeastModeExportPack } from "./modules/marketing/beast-mode";
import { buildScheduleExportPack } from "./modules/marketing/social-publishing/scheduleExportPackBuilder";

const repoRoot = path.resolve(import.meta.dirname, "..");

function read(rel: string) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

describe("PR53 final backend/source-of-truth hardening", () => {
  it("adds the PR53 audit doc", () => {
    expect(fs.existsSync(path.join(repoRoot, "docs/audits/PR53_FINAL_BACKEND_SOURCE_OF_TRUTH_AUDIT.md"))).toBe(true);
  });

  it("keeps one active Marketing App route chain", () => {
    const adminCampaigns = read("client/src/pages/AdminCampaigns.tsx");
    const appShell = read("client/src/components/marketing/app/TheMarketingApp.tsx");
    const studioHome = read("client/src/components/marketing/app/studio/StudioHome.tsx");

    expect(adminCampaigns).toContain("TheMarketingApp");
    expect(appShell).toContain("<StudioHome");
    expect(studioHome).toContain("StudioWorkbench");
  });

  it("quarantines inactive legacy studio layers with explicit warnings", () => {
    for (const file of [
      "client/src/components/marketing/legacy/quarantine/MarketingAppChat.tsx",
      "client/src/components/marketing/legacy/quarantine/MarketingAppPreview.tsx",
      "client/src/components/marketing/legacy/quarantine/MarketingStudioV2.tsx",
    ]) {
      const source = read(file);
      expect(source).toContain("LEGACY ONLY — must not be imported by active Marketing App route.");
    }
  });

  it("active route files do not import quarantined legacy layers", () => {
    const activeSources = [
      read("client/src/pages/AdminCampaigns.tsx"),
      read("client/src/components/marketing/app/TheMarketingApp.tsx"),
      read("client/src/components/marketing/app/studio/StudioHome.tsx"),
      read("client/src/components/marketing/app/studio/StudioWorkbench.tsx"),
    ].join("\n");

    for (const forbidden of ["MarketingAppChat", "MarketingAppPreview", "MarketingStudioV2", "legacy/quarantine"]) {
      expect(activeSources).not.toContain(forbidden);
    }
  });

  it("keeps TheMarketingApp as a thinner orchestration shell via hooks", () => {
    const shellPath = path.join(repoRoot, "client/src/components/marketing/app/TheMarketingApp.tsx");
    const source = fs.readFileSync(shellPath, "utf8");
    const lineCount = source.split("\n").length;

    for (const hookName of [
      "useMarketingWorkspaceConfig",
      "useMarketingBrandKit",
      "useMarketingAssets",
      "useMarketingCampaigns",
      "useMarketingReviewActions",
      "useMarketingCalendar",
    ]) {
      expect(source).toContain(hookName);
    }
    expect(lineCount).toBeLessThan(900);
  });

  it("marks legacy draft/media procedures as compatibility only", () => {
    const routerSource = read("server/routers.ts");
    expect(routerSource).toContain("LEGACY COMPATIBILITY ONLY — active Studio/Campaign/Beast Mode flows must not call this procedure.");
    expect(routerSource).toContain("LEGACY COMPATIBILITY ONLY — assembled Studio/Campaign/Beast Mode flows must use Media Factory render jobs instead.");
  });

  it("includes visual QA state in campaign, beast mode, and schedule export packs", () => {
    expect(read("server/modules/marketing/campaign-engine/campaignExportPackBuilder.ts")).toContain("visualQaStatus");
    expect(read("server/modules/marketing/beast-mode/index.ts")).toContain("visualQaStatus");
    expect(read("server/modules/marketing/social-publishing/scheduleExportPackBuilder.ts")).toContain("visualQaStatus");
  });

  it("exports campaign review and visual QA summaries together", () => {
    const pack = buildCampaignExportPack({
      brief: {
        campaignId: 1,
        tenantId: "global",
        workspaceId: "default",
        hostAppId: "equiprofile",
        brandKitId: 1,
        campaignName: "Launch",
        goal: "Drive signups",
        audience: "Stable owners",
        offer: "Free trial",
        primaryCta: "Sign up",
        channels: ["Facebook"],
        startDate: "2026-06-01",
        durationDays: 7,
        toneOfVoice: "Professional",
        brandContext: { brandName: "EquiProfile", domain: "equiprofile.com", primaryColor: "#111111", secondaryColor: "#ffffff" },
        platformStrategy: { Facebook: "Lead with proof" } as any,
        contentPillars: ["Trust"],
        successMetrics: ["Clicks"],
        constraints: [],
        generatedAt: "2026-06-01T00:00:00.000Z",
      },
      deliverables: [{
        day: 1,
        dayLabel: "Day 1",
        scheduledFor: "2026-06-01T09:00:00.000Z",
        platform: "Facebook",
        type: "video",
        title: "Launch",
        body: "Body copy",
        hook: "Strong hook",
        cta: "Sign up",
        hashtags: ["#equiprofile"],
        recommendedAssetType: "video",
        visualPrompt: "Horse arena",
        status: "export_only",
        reviewStatus: "approved",
        exported: true,
        metadata: {
          platformRule: "Keep it concise",
          qualityChecks: [],
          reviewChecklist: ["Tone: pass"],
          reviewChecklistSummary: { generatedAt: "2026-06-01T00:00:00.000Z", total: 1, passed: 1, failed: 0, blockingFailures: 0 },
          reviewQaScore: { passed: 1, failed: 0, score: 100, blockingFailureCount: 0, pass: true },
          reviewReason: null,
          manualOverride: null,
          visualQaStatus: "passed",
        },
      }] as any,
      linkedAssets: [],
    });

    expect(pack.reviewSummary[0]?.reviewStatus).toBe("approved");
    expect(pack.reviewSummary[0]?.visualQaStatus).toBe("passed");
    expect(pack.markdown).toContain("Visual QA: passed");
  });

  it("exports beast mode review and visual QA summaries together", () => {
    const pack = buildBeastModeExportPack({
      run: {
        id: 1,
        tenantId: "global",
        workspaceId: "default",
        hostAppId: "equiprofile",
        campaignId: 1,
        brandKitId: 1,
        name: "Launch Beast",
        goal: "Drive signups",
        audience: "Stable owners",
        mode: "standard",
        requestedVariantCount: 1,
        requestedPlatforms: ["Facebook"],
        requestedLanguages: ["English"],
        status: "completed",
        plan: {},
        summary: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      } as any,
      variants: [{
        id: 10,
        runId: 1,
        tenantId: "global",
        workspaceId: "default",
        hostAppId: "equiprofile",
        platform: "Facebook",
        contentType: "facebook_ad",
        language: "English",
        hook: "Hook",
        body: "Body",
        cta: "Sign up",
        visualPrompt: "Horse arena",
        reviewStatus: "approved",
        exportStatus: "export_only",
        metadata: { visualQaStatus: "failed", routing: {} },
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }] as any,
      brandSummary: { brandName: "EquiProfile" },
    });

    expect(pack.reviewStatuses[0]?.reviewStatus).toBe("approved");
    expect(pack.reviewStatuses[0]?.visualQaStatus).toBe("failed");
    expect(pack.markdown).toContain("Visual QA: failed");
  });

  it("exports schedule review and visual QA summaries together", () => {
    const pack = buildScheduleExportPack({
      tenantId: "global",
      workspaceId: "default",
      drafts: [{
        id: 1,
        tenantId: "global",
        workspaceId: "default",
        platform: "Facebook",
        title: "Launch",
        content: "Body copy",
        scheduledFor: "2026-06-01T09:00:00.000Z",
        status: "approved",
        reviewStatus: "approved",
        metadataJson: JSON.stringify({ visualQaStatus: "passed", hook: "Hook", cta: "Sign up" }),
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }],
    });

    const item = pack.platformGroups[0]?.days[0]?.items[0];
    expect(item?.reviewStatus).toBe("approved");
    expect(item?.visualQaStatus).toBe("passed");
    expect(item?.exportChecklist.join("\n")).toContain("Visual QA status: passed");
  });

  it("keeps social publishing truthful by default", () => {
    const registry = read("server/modules/marketing/social-publishing/socialPublisherRegistry.ts");
    expect(registry).toContain("canPublish: false");
    expect(registry).toContain('readinessStatus: "setup_needed"');
  });
});
