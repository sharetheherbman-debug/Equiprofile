import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminCampaigns.tsx"), "utf8");
const studioSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppSettings.tsx"), "utf8");
const topBarSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppTopBar.tsx"), "utf8");

describe("The Marketing App stabilized product path", () => {
  it("renders The Marketing App from AdminCampaigns and keeps top-bar sections", () => {
    expect(pageSource).toContain("TheMarketingApp");
    for (const section of ["Create", "Assets", "Campaigns", "Calendar", "Brand", "Settings"]) {
      expect(topBarSource).toContain(`label: "${section}"`);
    }
  });

  it("routes guided create through createMarketingStudioPlan and not raw media mutation", () => {
    expect(studioSource).toContain("createMarketingStudioPlan");
    expect(studioSource).not.toContain("createMediaJob.mutate");
    expect(studioSource).not.toContain("queueMedia(");
  });

  it("uses workspace tenant/workspace context in settings query", () => {
    expect(settingsSource).toContain("tenantId");
    expect(settingsSource).toContain("workspaceId");
    expect(settingsSource).not.toContain('tenantId: "global", workspaceId: "default"');
  });

  it("does not reintroduce Academy or MarketingStudioV2 references", () => {
    expect(studioSource).not.toContain("Academy");
    expect(pageSource).not.toContain("MarketingStudioV2");
  });
});
