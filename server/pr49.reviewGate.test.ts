import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMarketingQaChecklist } from "./modules/marketing/qa-engine";
import { scoreMarketingQaChecklist } from "./modules/marketing/qa-engine";

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

  it("qa checklist evaluates render warnings and equine context", () => {
    const checklist = buildMarketingQaChecklist({
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

  it("enforces reason for reject/request changes and export gating", () => {
    const source = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    expect(source).toContain("reason: z.string().min(1).max(4000)");
    expect(source).toContain("Approving requires QA checklist to exist");
    expect(source).toContain("Exported requires approved status or manual override");
    expect(source).toContain("reviewStatus:");
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
    expect(campaignPanelSource).toContain("Reject");
    expect(campaignPanelSource).toContain("Request changes");
    expect(exportStepSource).toContain("Review status");
    expect(exportStepSource).toContain("Needs review before it is considered export-ready");
    expect(campaignPanelSource).not.toContain("OAuth");
    expect(campaignPanelSource).not.toContain("analytics");
    expect(campaignPanelSource).not.toContain("Academy");
  });
});
