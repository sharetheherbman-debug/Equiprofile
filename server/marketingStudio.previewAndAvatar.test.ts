import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const previewEngineSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/previews/index.tsx"), "utf8");
const previewCanvasSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppPreview.tsx"), "utf8");
const presenterSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/PresenterSelector.tsx"), "utf8");
const platformSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/PlatformConnectionCards.tsx"), "utf8");
const drawerSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/SetupDrawer.tsx"), "utf8");
const typesSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/types.ts"), "utf8");

describe("Marketing Studio V2 preview, platform and presenter system", () => {
  it("keeps one preview engine and extends it for the approved Studio surfaces", () => {
    for (const platform of ["Facebook", "Instagram", "TikTok", "YouTube Shorts", "YouTube Long-form", "LinkedIn", "Google Business", "Email", "Blog"]) {
      expect(previewEngineSource).toContain(platform);
    }
    expect(previewCanvasSource).toContain("StudioPreviewCard");
    expect(previewCanvasSource).toContain("Your generated caption, script and CTA will update this preview immediately.");
  });

  it("renders the canonical platform connection cards without unsupported channels", () => {
    expect(platformSource).toContain("SUPPORTED_PLATFORMS");
    expect(typesSource).toContain("Connection flow required before direct publishing");
    for (const excluded of ["Telegram", "Snapchat", "Pinterest", "Reddit"]) {
      expect(platformSource).not.toContain(excluded);
    }
  });

  it("includes the canonical presenter selector and truthful avatar status", () => {
    for (const presenter of ["Stable Growth Coach", "Riding School Advisor", "Calm Professional Presenter", "Premium Brand Host"]) {
      expect(presenterSource).toContain(presenter);
    }
    expect(presenterSource).toContain("Avatar script ready");
    expect(presenterSource).toContain("Avatar video setup needed");
    expect(drawerSource).toContain("PresenterSelector");
  });
});
