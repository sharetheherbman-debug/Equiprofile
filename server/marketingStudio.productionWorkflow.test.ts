import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppSettings.tsx"), "utf8");
const resultCardSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/ChatResultCard.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("Studio production workflow truth contracts", () => {
  it("keeps raw media generation out of normal create path", () => {
    expect(studioSource).toContain("createMarketingStudioPlan");
    expect(studioSource).not.toContain("createMediaJob.mutate");
    expect(studioSource).not.toContain("queueMedia(");
  });

  it("shows section-level error cards with retry instead of crashing", () => {
    expect(studioSource).toContain("SectionErrorCard");
    expect(studioSource).toContain("Something failed to load. Please retry.");
    expect(settingsSource).toContain("Could not load social connections right now.");
    expect(settingsSource).toContain("Retry");
  });

  it("keeps result cards user-facing and compact", () => {
    expect(resultCardSource).toContain("Expand preview");
    expect(resultCardSource).toContain("Open asset");
    expect(resultCardSource).toContain("Delete permanently");
    expect(resultCardSource).not.toContain("result.prompt");
  });

  it("creates studio plans with capability result in backend", () => {
    expect(routerSource).toContain("status: \"planned\" as const");
    expect(routerSource).toContain("capability");
    expect(routerSource).toContain("renderMode: capability.finalDeliveryMode");
  });
});
