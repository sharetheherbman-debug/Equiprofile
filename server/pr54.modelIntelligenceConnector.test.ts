import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const routersSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("PR54A marketing model intelligence + connector activation", () => {
  it("adds model intelligence procedures for marketing app provider diagnostics", () => {
    expect(routersSource).toContain("syncMarketingProviderCapabilities: adminUnlockedProcedure");
    expect(routersSource).toContain("getMarketingProviderReadiness: adminUnlockedProcedure");
    expect(routersSource).toContain("getMarketingProviderModelInventory: adminUnlockedProcedure");
    expect(routersSource).toContain("getMarketingTaskCapabilityMap: adminUnlockedProcedure");
    expect(routersSource).toContain("testMarketingProviderTaskRoute: adminUnlockedProcedure");
  });

  it("adds platform connector and publish workflow procedures", () => {
    expect(routersSource).toContain("connectMarketingPlatform: adminUnlockedProcedure");
    expect(routersSource).toContain("publishApprovedScheduleDraft: adminUnlockedProcedure");
    expect(routersSource).toContain("getMarketingPublishStatus: adminUnlockedProcedure");
  });

  it("uses provider discovery and route-aware testing in PR54 procedures", () => {
    expect(routersSource).toContain("discoverProviderModels");
    expect(routersSource).toContain("resolveModelCandidatesForTask");
    expect(routersSource).toContain("executeAITaskWithProviderRoute");
  });

  it("uses social publisher registry when connecting and publishing", () => {
    expect(routersSource).toContain("getSocialPublisher");
    expect(routersSource).toContain("publisher.validatePayload(payload)");
    expect(routersSource).toContain("publisher.publishApprovedDraft(payload)");
  });
});
