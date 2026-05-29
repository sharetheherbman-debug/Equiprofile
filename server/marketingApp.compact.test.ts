import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const studioSource = readFileSync(resolve(root, "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const studioHomeSource = readFileSync(resolve(root, "client/src/components/marketing/app/studio/StudioHome.tsx"), "utf8");
const settingsSource = readFileSync(resolve(root, "client/src/components/marketing/app/MarketingAppSettings.tsx"), "utf8");
const resultCardSource = readFileSync(resolve(root, "client/src/components/marketing/app/ChatResultCard.tsx"), "utf8");
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");

describe("Marketing app active path lockdown", () => {
  it("keeps normal Create flow guided-only", () => {
    expect(studioHomeSource).toContain("StudioWorkbench");
    expect(studioHomeSource).not.toContain("Free-form chat");
    expect(studioHomeSource).not.toContain("MarketingAppChat");
  });

  it("does not call createMediaJob from normal create submit path", () => {
    expect(studioSource).not.toContain("handleChatSubmit");
    expect(studioSource).not.toContain("queueMedia(");
    expect(studioSource).not.toContain("createMediaJob.mutate");
    expect(studioSource).toContain("createMarketingStudioPlan.mutate");
  });

  it("wires createMarketingStudioPlan through capability validation", () => {
    expect(routerSource).toContain("createMarketingStudioPlan: adminUnlockedProcedure");
    expect(routerSource).toContain("validateMarketingCapability");
  });

  it("keeps settings social query bound to workspace tenant/workspace ids", () => {
    expect(settingsSource).toContain("useQuery({ tenantId, workspaceId })");
    expect(settingsSource).toContain("Could not load social connections right now.");
    expect(settingsSource).toContain("Retry");
  });

  it("hides compiled prompts from normal result cards", () => {
    expect(resultCardSource).toContain("result.summary");
    expect(resultCardSource).not.toContain("result.prompt");
    expect(resultCardSource).not.toContain("Provider:");
    expect(resultCardSource).not.toContain("Model:");
  });
});
