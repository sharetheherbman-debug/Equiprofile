import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const routersSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
const marketingAppSource = readFileSync(resolve(root, "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const settingsSource = readFileSync(resolve(root, "client/src/components/marketing/app/MarketingAppSettings.tsx"), "utf8");

describe("PR40 marketing backend foundation", () => {
  it("adds campaign/social/schedule tables to schema and startup safety-net", () => {
    expect(schemaSource).toContain("marketingCampaigns");
    expect(schemaSource).toContain("marketingCampaignItems");
    expect(schemaSource).toContain("marketingCampaignAssets");
    expect(schemaSource).toContain("marketingSocialConnections");
    expect(schemaSource).toContain("marketingScheduleDrafts");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS `marketingCampaigns`");
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS `marketingScheduleDrafts`");
  });

  it("exposes campaign procedures", () => {
    for (const name of [
      "listMarketingCampaigns",
      "getMarketingCampaign",
      "createMarketingCampaign",
      "updateMarketingCampaign",
      "deleteMarketingCampaign",
      "generateCampaignPlan",
      "generateWeeklyContentPack",
      "exportCampaignPack",
    ]) {
      expect(routersSource).toContain(`${name}: adminUnlockedProcedure`);
    }
  });

  it("exposes campaign item and campaign asset procedures", () => {
    for (const name of [
      "listMarketingCampaignItems",
      "createMarketingCampaignItem",
      "updateMarketingCampaignItem",
      "deleteMarketingCampaignItem",
      "approveMarketingCampaignItem",
      "markMarketingCampaignItemExportOnly",
      "attachAssetToCampaign",
      "detachAssetFromCampaign",
      "listCampaignAssets",
    ]) {
      expect(routersSource).toContain(`${name}: adminUnlockedProcedure`);
    }
  });

  it("exposes social connection and scheduler draft procedures", () => {
    for (const name of [
      "listMarketingSocialConnections",
      "upsertMarketingSocialConnectionStatus",
      "getMarketingPublishingReadiness",
      "listMarketingScheduleDrafts",
      "createMarketingScheduleDraft",
      "updateMarketingScheduleDraft",
      "cancelMarketingScheduleDraft",
      "approveMarketingScheduleDraft",
    ]) {
      expect(routersSource).toContain(`${name}: adminUnlockedProcedure`);
    }
  });

  it("adds prompt fidelity preflight failure and metadata persistence", () => {
    expect(routersSource).toContain("prompt_preflight_failed");
    expect(routersSource).toContain("inferredSubject");
    expect(routersSource).toContain("forbiddenMismatches");
    expect(routersSource).toContain("originalUserPrompt");
    expect(routersSource).toContain("qualityMode");
    expect(routersSource).toContain("providerCandidates");
  });

  it("adds stock media search/import procedures with setup_needed behavior", () => {
    expect(routersSource).toContain("searchStockMedia: adminUnlockedProcedure");
    expect(routersSource).toContain("importStockMediaAsset: adminUnlockedProcedure");
    expect(routersSource).toContain("status: \"setup_needed\"");
    expect(routersSource).toContain("marketing_pexels_api_key");
    expect(routersSource).toContain("marketing_pixabay_api_key");
  });

  it("wires frontend campaigns/calendar/settings to new backend procedures", () => {
    expect(marketingAppSource).toContain("trpc.admin.listMarketingCampaigns.useQuery");
    expect(marketingAppSource).toContain("trpc.admin.listMarketingScheduleDrafts.useQuery");
    expect(marketingAppSource).toContain("trpc.admin.exportCampaignPack");
    expect(settingsSource).toContain("trpc.admin.listMarketingSocialConnections.useQuery");
  });
});
