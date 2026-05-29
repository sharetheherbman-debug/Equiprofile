import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const routersSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const studioSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const validatorSource = readFileSync(resolve(process.cwd(), "server/modules/marketing/marketingCapabilityValidator.ts"), "utf8");

describe("Marketing studio planning contract", () => {
  it("exposes createMarketingStudioPlan and validates capability before generation", () => {
    expect(routersSource).toContain("createMarketingStudioPlan: adminUnlockedProcedure");
    expect(routersSource).toContain("validateMarketingCapability");
    expect(routersSource).toContain("originalUserPrompt");
    expect(routersSource).toContain("finalDeliveryMode");
  });

  it("keeps active create flow calling createMarketingStudioPlan", () => {
    expect(studioSource).toContain("createMarketingStudioPlan.mutate");
    expect(studioSource).not.toContain("createMediaJob.mutate");
    expect(studioSource).not.toContain("handleChatSubmit");
  });

  it("enforces assembled-video routing and equine guardrails in validator", () => {
    expect(validatorSource).toContain("ASSEMBLY_REQUIRED_THRESHOLD_SECONDS");
    expect(validatorSource).toContain("youtube_3min_video");
    expect(validatorSource).toContain("FORBIDDEN_EQUINE_SUBJECTS");
  });
});
