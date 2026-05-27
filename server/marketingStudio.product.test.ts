import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminCampaigns.tsx"), "utf8");
const studioSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/MarketingStudioV2.tsx"), "utf8");
const heroSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/StudioHero.tsx"), "utf8");
const commandSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/StudioCommandCenter.tsx"), "utf8");
const quickCreateSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/QuickCreateTiles.tsx"), "utf8");
const outputSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/OutputCanvas.tsx"), "utf8");
const previewSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/PreviewCanvas.tsx"), "utf8");
const kanbanSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/CampaignKanban.tsx"), "utf8");
const assetSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/AssetLibrary.tsx"), "utf8");
const autopilotSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/AutopilotWizard.tsx"), "utf8");
const drawerSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/SetupDrawer.tsx"), "utf8");
const qualitySource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/QualityToggle.tsx"), "utf8");
const platformSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/PlatformConnectionCards.tsx"), "utf8");
const typesSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/types.ts"), "utf8");
const adminSource = readFileSync(resolve(process.cwd(), "client/src/pages/Admin.tsx"), "utf8");

describe("Marketing Studio V2 frontend source of truth", () => {
  it("keeps one canonical admin route and one canonical Studio shell", () => {
    expect(adminSource).toContain('if (activeSection === "campaigns")');
    expect(pageSource).toContain("MarketingStudioV2");
    expect(pageSource).not.toContain("MarketingCommandComposer");
    expect(pageSource).not.toContain("MarketingResultCard");
    expect(pageSource).not.toContain("MarketingActionRail");
    expect(pageSource).not.toContain("AvatarStudioFields");
  });

  it("exposes exactly the four primary product areas in the visible Studio nav", () => {
    for (const area of ["Create", "Campaigns", "Assets", "Autopilot"]) {
      expect(studioSource).toContain(`label: "${area}"`);
    }
    for (const oldTab of ["Brand DNA", "Audience / CRM", "Developer Diagnostics", "SettingsTab", "PlatformsTab"]) {
      expect(studioSource).not.toContain(oldTab);
    }
  });

  it("keeps generic admin KPI cards out of the Marketing Studio module", () => {
    const sources = [studioSource, heroSource, commandSource, outputSource, kanbanSource, assetSource, autopilotSource].join("\n");
    for (const text of ["Total Users", "Paid Subscribers", "Total Horses", "Overdue Payments", "Admin Dashboard"]) {
      expect(sources).not.toContain(text);
    }
  });

  it("renders command center, quick create tiles, output canvas, campaign kanban, asset library and autopilot wizard", () => {
    expect(commandSource).toContain("What should your AI marketing team create today?");
    expect(quickCreateSource).toContain("QUICK_CREATE_LABELS");
    expect(outputSource).toContain("Output Canvas");
    expect(outputSource).toContain("normalizeDraftFromText");
    expect(kanbanSource).toContain("Campaign Kanban");
    expect(assetSource).toContain("Asset Library");
    expect(autopilotSource).toContain("Autopilot Wizard");
    expect(autopilotSource).toContain("Ready for approval workflow.");
  });

  it("supports structured and plain text fallback output on the same create screen", () => {
    expect(outputSource).toContain("Strategy");
    expect(outputSource).toContain("Hook");
    expect(outputSource).toContain("Script / body");
    expect(outputSource).toContain("Shot list / storyboard");
    expect(outputSource).toContain("Media plan");
    expect(typesSource).toContain("normalizeDraftFromText");
  });

  it("uses Standard and Elite only in normal model UX", () => {
    expect(qualitySource).toContain("Standard");
    expect(qualitySource).toContain("Elite");
    expect(studioSource).toContain('quality === "elite" ? "premium" : "professional"');
    for (const hiddenTechnical of ["gpt-5.4", "genx_model", "qwen_model", "hf_task", "base URL"]) {
      expect([studioSource, heroSource, commandSource, qualitySource].join("\n")).not.toContain(hiddenTechnical);
    }
  });

  it("keeps provider and debug details hidden in Developer Diagnostics only", () => {
    expect(drawerSource).toContain("Developer Diagnostics");
    expect(drawerSource).toContain("showDiagnostics");
    const normalSources = [studioSource, heroSource, commandSource, quickCreateSource, outputSource, kanbanSource, assetSource, autopilotSource].join("\n");
    for (const text of ["tenantScope", "raw JSON", "provider matrix", "endpoint URL", "HF_TASK_COPYWRITING_MODEL"]) {
      expect(normalSources).not.toContain(text);
    }
  });

  it("shows truthful video job states and retries GenX without calling draft generation", () => {
    expect(studioSource).toContain("testGenXMediaGeneration");
    expect(studioSource).toContain("queueMedia(requestedMediaTask, null, trimmed)");
    expect(previewSource).toContain("Video queued");
    expect(previewSource).toContain("Generating video");
    expect(previewSource).toContain("Video failed");
    expect(previewSource).toContain("Video model missing");
    expect(previewSource).toContain("Retry with GenX");
    expect(previewSource).toContain("Create branded version");
    expect(previewSource).not.toContain("Media Ready");
  });

  it("keeps Studio UI in processing lifecycle during retries instead of premature failure", () => {
    expect(studioSource).toContain('lifecycleStatus && lifecycleStatus !== "failed"');
    expect(studioSource).toContain('status: lifecycleStatus');
    expect(studioSource).toContain('status === "retrying"');
    expect(studioSource).toContain("Retrying with alternate prompt/model");
  });

  it("uses reusable workspace context instead of hardcoded global tenant strings in Studio orchestration", () => {
    const workspaceSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/workspaceConfig.ts"), "utf8");
    expect(workspaceSource).toContain("appId");
    expect(workspaceSource).toContain("tenantId");
    expect(workspaceSource).toContain("assetNamespace");
    expect(workspaceSource).toContain("storagePrefix");
    expect(studioSource).toContain("tenantId: workspace.tenantId");
    expect(studioSource).not.toContain('tenantId: "global"');
  });

  it("includes only the approved primary platform scope", () => {
    for (const platform of ["Facebook Pages", "Instagram Business", "TikTok Business", "YouTube Shorts", "YouTube Long-form", "LinkedIn Company Pages", "Google Business Profile", "Email", "Blog / SEO"]) {
      expect(typesSource).toContain(platform);
      expect(platformSource).toContain("SUPPORTED_PLATFORMS");
    }
    for (const excluded of ["Telegram", "Snapchat", "Pinterest", "X / Twitter", "Reddit"]) {
      expect([typesSource, platformSource, studioSource, autopilotSource].join("\n")).not.toContain(excluded);
    }
  });

  it("keeps setup drawers secondary instead of dominant top-level tabs", () => {
    for (const drawer of ["Brand Setup", "Audience Setup", "Platform Connections", "Provider Settings", "Presenter Setup"]) {
      expect(drawerSource).toContain(drawer);
    }
    expect(studioSource).toContain('setDrawer("brand")');
    expect(studioSource).toContain('setDrawer("audience")');
    expect(studioSource).toContain('setDrawer("presenter")');
  });
});
