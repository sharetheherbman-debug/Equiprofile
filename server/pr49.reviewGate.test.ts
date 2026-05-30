import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMarketingQaChecklist } from "./modules/marketing/qa-engine";
import { scoreMarketingQaChecklist } from "./modules/marketing/qa-engine";
import { shouldApplyEquineQa } from "./modules/marketing/qa-engine";
import { buildCampaignExportPack } from "./modules/marketing/campaign-engine/campaignExportPackBuilder";

const root = process.cwd();

describe("PR49 review gate", () => {
  it("includes PR49 precheck audit doc and PR48 campaign engine files", () => {
    expect(existsSync(resolve(root, "docs/audits/PR49_PRECHECK_PR48_CAMPAIGN_ENGINE_TRUTH.md"))).toBe(true);
    expect(existsSync(resolve(root, "server/modules/marketing/campaign-engine/index.ts"))).toBe(true);
    expect(existsSync(resolve(root, "server/modules/marketing/campaign-engine/campaignBriefBuilder.ts"))).toBe(true);
    expect(existsSync(resolve(root, "server/modules/marketing/campaign-engine/campaignDeliverablePlanner.ts"))).toBe(true);
    expect(existsSync(resolve(root, "server/modules/marketing/campaign-engine/platformContentRules.ts"))).toBe(true);
    expect(existsSync(resolve(root, "server/modules/marketing/campaign-engine/campaignCopyGenerator.ts"))).toBe(true);
    expect(existsSync(resolve(root, "server/modules/marketing/campaign-engine/campaignVideoPlanner.ts"))).toBe(true);
    expect(existsSync(resolve(root, "server/modules/marketing/campaign-engine/campaignExportPackBuilder.ts"))).toBe(true);
    expect(existsSync(resolve(root, "server/modules/marketing/campaign-engine/campaignQualityRules.ts"))).toBe(true);
  });

  it("keeps campaign engine isolated from legacy draft/raw media APIs and manual copy placeholder", () => {
    const campaignEngineSource = readFileSync(resolve(root, "server/modules/marketing/campaign-engine/index.ts"), "utf8");
    const plannerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    expect(campaignEngineSource).not.toContain("createMarketingDraft");
    expect(campaignEngineSource).not.toContain("createMediaJob");
    expect(plannerSource).not.toContain("Manual posting copy");
    expect(plannerSource).toContain('reviewStatus: "needs_review"');
  });

  it("adds review schema and statuses", () => {
    const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
    const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    expect(schemaSource).toContain("marketingReviewRecords");
    expect(schemaSource).toContain('reviewStatus: varchar("reviewStatus"');
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS \\`marketingReviewRecords\\`");
    expect(routerSource).toContain("MARKETING_REVIEW_STATUSES");
    expect(routerSource).toContain("getMarketingReviewStatus");
    expect(routerSource).toContain("approveMarketingOutput");
    expect(routerSource).toContain("rejectMarketingOutput");
    expect(routerSource).toContain("requestMarketingOutputChanges");
    expect(routerSource).toContain("markMarketingOutputExported");
  });

  it("qa checklist flags placeholder copy and checks CTA/platform/equine rules", () => {
    const checklist = buildMarketingQaChecklist({
      hostAppId: "equiprofile",
      targetType: "campaign_item",
      targetId: "42",
      content: "Manual posting copy placeholder TODO",
      platform: "Facebook",
      cta: "",
      brandTone: "professional",
    });
    const score = scoreMarketingQaChecklist(checklist);
    expect(checklist.items.find((item) => item.key === "copy_no_placeholder")?.passed).toBe(false);
    expect(checklist.items.find((item) => item.key === "copy_cta")?.passed).toBe(false);
    expect(checklist.items.find((item) => item.key === "copy_platform_fit")?.passed).toBe(true);
    expect(checklist.items.find((item) => item.key === "equine_context")?.passed).toBe(false);
    expect(score.pass).toBe(false);
  });

  it("qa checklist evaluates render warnings and equine context for equine targets", () => {
    const checklist = buildMarketingQaChecklist({
      hostAppId: "equiprofile",
      targetType: "render_job",
      targetId: "77",
      content: "Horse stable walkthrough with captions and CTA",
      warnings: ["scene fallback"],
      metadata: {
        brandName: "EquiProfile",
        domain: "equiprofile.online",
        captionStatus: "generated",
        sceneCount: 3,
        needsReviewSceneCount: 1,
        needsReviewAcknowledged: true,
      },
    });
    expect(checklist.items.find((item) => item.key === "render_warnings_reviewed")?.passed).toBe(false);
    expect(checklist.items.find((item) => item.key === "equine_context")?.passed).toBe(true);
  });

  it("scopes equine QA to equine contexts only", () => {
    const genericChecklist = buildMarketingQaChecklist({
      hostAppId: "generic-crm",
      targetType: "campaign_item",
      targetId: "9",
      content: "Launch a laptop workflow campaign for office teams",
      platform: "LinkedIn",
      cta: "Book a demo",
      metadata: { audience: "operations teams" },
    });
    const horseChecklist = buildMarketingQaChecklist({
      hostAppId: "generic-crm",
      targetType: "campaign_item",
      targetId: "10",
      content: "Create a horse care reel for stable owners",
      platform: "Instagram",
      cta: "Start today",
      metadata: { audience: "horse owners" },
    });
    expect(genericChecklist.items.find((item) => item.key === "equine_context")).toBeUndefined();
    expect(horseChecklist.items.find((item) => item.key === "equine_context")).toBeDefined();
    expect(shouldApplyEquineQa({ hostAppId: "equiprofile", content: "Generic launch copy" })).toBe(true);
    expect(shouldApplyEquineQa({ hostAppId: "generic-crm", content: "Horse stable owners welcome" })).toBe(true);
    expect(shouldApplyEquineQa({ hostAppId: "generic-crm", content: "Laptop workflow campaign" })).toBe(false);
  });

  it("still blocks off-topic laptop or gibberish drift for equine outputs", () => {
    const checklist = buildMarketingQaChecklist({
      hostAppId: "generic-crm",
      targetType: "campaign_item",
      targetId: "11",
      content: "Horse stable owners using a laptop lifestyle gibberish campaign",
      platform: "Facebook",
      cta: "Book now",
    });
    expect(checklist.items.find((item) => item.key === "equine_no_drift")?.passed).toBe(false);
    expect(scoreMarketingQaChecklist(checklist).pass).toBe(false);
  });

  it("enforces passing QA/manual override for approval and export gating", () => {
    const source = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    expect(source).toContain("reason: z.string().min(1).max(4000)");
    expect(source).toContain("Approving requires QA checklist to exist");
    expect(source).toContain("manualOverride: z.boolean().default(false)");
    expect(source).toContain("Manual override requires a reason.");
    expect(source).toContain("Approving requires a passing QA score or explicit manual override.");
    expect(source).toContain("Exported requires approved status or manual override");
    expect(source).toContain('action: "approve"');
    expect(source).toContain('action: "export"');
    expect(source).toContain("reviewStatus:");
  });

  it("stores review metadata for auditable overrides", () => {
    const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
    const storeSource = readFileSync(resolve(root, "server/modules/marketing/qa-engine/marketingReviewStore.ts"), "utf8");
    expect(schemaSource).toContain('metadataJson: text("metadataJson")');
    expect(dbSource).toContain("metadataJson");
    expect(storeSource).toContain("metadataJson: input.metadata ? JSON.stringify(input.metadata) : null");
  });

  it("includes regeneration/rerender loop and preserves context", () => {
    const source = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    expect(source).toContain("regenerateCampaignItem");
    expect(source).toContain("reviseCampaignItemCopy");
    expect(source).toContain("markSceneNeedsReview");
    expect(source).toContain("replaceSceneMedia");
    expect(source).toContain("regenerateScenePlanText");
    expect(source).toContain("rerenderMarketingRenderJob");
    expect(source).toContain("preservedCampaignContext");
    expect(source).toContain('reviewStatus: "needs_review"');
    expect(source).toContain("createMarketingRenderJobRecord");
  });

  it("wires frontend campaigns and export review actions without social/academy scope creep", () => {
    const campaignPanelSource = readFileSync(resolve(root, "client/src/components/marketing/app/MarketingAppPanels.tsx"), "utf8");
    const exportStepSource = readFileSync(resolve(root, "client/src/components/marketing/app/studio/ExportStep.tsx"), "utf8");
    expect(campaignPanelSource).toContain("Review:");
    expect(campaignPanelSource).toContain("Run QA");
    expect(campaignPanelSource).toContain("Approve");
    expect(campaignPanelSource).toContain("Mark exported");
    expect(campaignPanelSource).toContain("Reject");
    expect(campaignPanelSource).toContain("Request changes");
    expect(exportStepSource).toContain("Review status");
    expect(exportStepSource).toContain("Needs review before it is considered export-ready");
    expect(exportStepSource).toContain("Mark exported");
    expect(campaignPanelSource).not.toContain("OAuth");
    expect(campaignPanelSource).not.toContain("analytics");
    expect(campaignPanelSource).not.toContain("Academy");
  });

  it("campaign export pack includes exported state, QA summaries, and manual override indicators", () => {
    const pack = buildCampaignExportPack({
      brief: {
        campaignId: 1,
        tenantId: "global",
        workspaceId: "default",
        hostAppId: "equiprofile",
        brandKitId: 1,
        campaignName: "Stable Launch",
        goal: "Get demos",
        audience: "Stable owners",
        offer: "Stable software",
        primaryCta: "Book demo",
        channels: ["Facebook"],
        startDate: "2026-01-01",
        durationDays: 7,
        toneOfVoice: "helpful",
        brandContext: {
          brandName: "EquiProfile",
          domain: "equiprofile.online",
          primaryColor: "#1e3a5f",
          secondaryColor: "#c5a55a",
        },
        platformStrategy: { Facebook: "Lead with proof" },
        contentPillars: ["care"],
        successMetrics: ["clicks"],
        constraints: ["no placeholder copy"],
        generatedAt: "2026-01-01T00:00:00.000Z",
      },
      deliverables: [{
        day: 1,
        dayLabel: "Day 1",
        scheduledFor: "2026-01-01T00:00:00.000Z",
        platform: "Facebook",
        type: "post",
        title: "Launch",
        body: "Horse stable launch post",
        hook: "Stable owners, simplify your workflow",
        cta: "Book demo",
        hashtags: ["#horse"],
        recommendedAssetType: "text",
        visualPrompt: "Horse stable team",
        status: "export_only",
        reviewStatus: "exported",
        exported: true,
        metadata: {
          campaignItemId: 7,
          platformRule: "Short lead hook",
          qualityChecks: ["No placeholder copy"],
          reviewChecklist: ["Horse/equine/stable context preserved: pass"],
          reviewChecklistSummary: {
            generatedAt: "2026-01-01T00:00:00.000Z",
            total: 3,
            passed: 3,
            failed: 0,
            blockingFailures: 0,
          },
          reviewQaScore: {
            passed: 3,
            failed: 0,
            score: 100,
            blockingFailureCount: 0,
            pass: true,
          },
          reviewReason: "Approved for export",
          manualOverride: {
            used: true,
            action: "export",
            reason: "Ops verified downstream delivery",
          },
        },
      }],
      linkedAssets: [],
    });
    expect(pack.dayByDayCalendar[0]?.items[0]?.exported).toBe(true);
    expect(pack.reviewSummary[0]?.reviewStatus).toBe("exported");
    expect(pack.reviewSummary[0]?.exported).toBe(true);
    expect(pack.reviewSummary[0]?.qaScore?.pass).toBe(true);
    expect(pack.reviewSummary[0]?.checklistSummary?.passed).toBe(3);
    expect(pack.reviewSummary[0]?.manualOverride?.used).toBe(true);
    expect(pack.markdown).toContain("Exported: yes");
    expect(pack.markdown).toContain("QA score: 100% (pass)");
    expect(pack.markdown).toContain("Manual override: export");
  });
});
