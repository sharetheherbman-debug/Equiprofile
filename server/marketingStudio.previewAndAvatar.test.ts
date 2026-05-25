import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const previewEngineSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/previews/index.tsx"), "utf8");
const avatarStudioSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/avatarStudio/index.tsx"), "utf8");
const campaignsPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminCampaigns.tsx"), "utf8");

describe("Marketing Studio preview and avatar system", () => {
  it("supports all required preview surfaces", () => {
    for (const platform of ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Email", "Blog", "Carousel", "Ad"]) {
      expect(previewEngineSource).toContain(platform);
    }
    expect(previewEngineSource).toContain("scheduleRecommendation");
    expect(previewEngineSource).toContain("Live preview");
  });

  it("includes avatar studio with presenter consistency controls", () => {
    expect(avatarStudioSource).toContain("Avatar Studio");
    expect(avatarStudioSource).toContain("Prebuilt presenters");
    expect(avatarStudioSource).toContain("Presenter consistency note");
    for (const field of ["Presenter/avatar", "Voice", "Accent", "Style", "Personality", "Outfit/look", "Tone", "Pacing"]) {
      expect(avatarStudioSource).toContain(field);
    }
  });

  it("wires avatar studio and preview engine into marketing studio flow", () => {
    expect(campaignsPageSource).toContain("AvatarStudioFields");
    expect(campaignsPageSource).toContain("PlatformPreview");
    expect(campaignsPageSource).toContain("AI team progress");
  });
});
