import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminCampaigns.tsx"), "utf8");
const studioSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");
const previewSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppPreview.tsx"), "utf8");
const topBarSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppTopBar.tsx"), "utf8");
const settingsSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppSettings.tsx"), "utf8");
const chatSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/MarketingAppChat.tsx"), "utf8");
const typesSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/types.ts"), "utf8");
const platformSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/PlatformConnectionCards.tsx"), "utf8");
const adminSource = readFileSync(resolve(process.cwd(), "client/src/pages/Admin.tsx"), "utf8");

describe("The Marketing App frontend source of truth", () => {
  it("renders The Marketing App instead of old Marketing Studio", () => {
    expect(adminSource).toContain('if (activeSection === "campaigns")');
    expect(pageSource).toContain("TheMarketingApp");
    expect(pageSource).not.toContain("MarketingCommandComposer");
    expect(pageSource).not.toContain("MarketingResultCard");
    expect(pageSource).not.toContain("AvatarStudioFields");
  });

  it("has no second permanent sidebar inside The Marketing App", () => {
    const allNewSources = [studioSource, previewSource, topBarSource, settingsSource, chatSource].join("\n");
    expect(allNewSources).not.toContain("<Sidebar");
    expect(allNewSources).not.toContain("SidebarProvider");
  });

  it("exposes five navigation sections in the top bar without a permanent second sidebar", () => {
    for (const section of ["Assets", "Campaigns", "Calendar", "Brand", "Settings"]) {
      expect(topBarSource).toContain(`label: "${section}"`);
    }
    expect(topBarSource).not.toContain("<Sidebar");
    expect(topBarSource).not.toContain("SidebarProvider");
  });

  it("shows The Marketing App title and EquiProfile workspace badge in the top bar", () => {
    expect(topBarSource).toContain("The Marketing App");
    expect(topBarSource).toContain("EquiProfile");
    expect(topBarSource).toContain("Standard");
    expect(topBarSource).toContain("Elite");
  });

  it("keeps generic admin KPI cards out of The Marketing App", () => {
    const sources = [studioSource, previewSource, topBarSource, chatSource].join("\n");
    for (const text of ["Total Users", "Paid Subscribers", "Total Horses", "Overdue Payments", "Admin Dashboard"]) {
      expect(sources).not.toContain(text);
    }
  });

  it("uses Standard and Elite only in normal model UX and routes tone through quality mode", () => {
    expect(topBarSource).toContain("Standard");
    expect(topBarSource).toContain("Elite");
    expect(studioSource).toContain('quality === "elite" ? "premium" : "professional"');
  });

  it("keeps provider and debug details hidden in Developer Diagnostics only", () => {
    expect(settingsSource).toContain("Developer Diagnostics");
    expect(settingsSource).toContain("showDiagnostics");
    const normalSources = [studioSource, previewSource, topBarSource, chatSource].join("\n");
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

  it("keeps The Marketing App in processing lifecycle during retries instead of premature failure", () => {
    expect(studioSource).toContain('lifecycleStatus && lifecycleStatus !== "failed"');
    expect(studioSource).toContain("status: lifecycleStatus");
    expect(studioSource).toContain('status === "retrying"');
    expect(studioSource).toContain("Retrying with alternate prompt/model");
  });

  it("uses reusable workspace context instead of hardcoded global tenant strings", () => {
    const workspaceSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/studio/workspaceConfig.ts"), "utf8");
    expect(workspaceSource).toContain("appId");
    expect(workspaceSource).toContain("tenantId");
    expect(workspaceSource).toContain("assetNamespace");
    expect(workspaceSource).toContain("storagePrefix");
    expect(studioSource).toContain("tenantId: workspace.tenantId");
    expect(studioSource).not.toContain('tenantId: "global"');
  });

  it("keeps Marketing App provider keys separate from EquiProfile dashboard AI keys", () => {
    for (const provider of ["GenX", "Qwen", "Hugging Face", "Pexels", "Pixabay"]) {
      expect(settingsSource).toContain(provider);
    }
    expect(settingsSource).not.toContain("dashboardAiKey");
    expect(settingsSource).not.toContain("globalAiKey");
    expect(settingsSource).toContain("The Marketing App");
  });

  it("shows truthful publishing status and does not fake posting or analytics", () => {
    expect(settingsSource).toContain("Connection flow required before direct publishing");
    expect(settingsSource).toContain("export_only");
    expect(settingsSource).toContain("setup_needed");
    const allSources = [studioSource, previewSource, topBarSource, chatSource, settingsSource].join("\n");
    for (const fake of ["Posted successfully", "Reach: 10,000", "Engagement rate:", "fake analytics", "Followers gained:"]) {
      expect(allSources).not.toContain(fake);
    }
  });

  it("includes only the approved primary platform scope", () => {
    for (const platform of ["Facebook Pages", "Instagram Business", "TikTok Business", "YouTube Shorts", "YouTube Long-form", "LinkedIn Company Pages", "Google Business Profile", "Email", "Blog / SEO"]) {
      expect(typesSource).toContain(platform);
      expect(platformSource).toContain("SUPPORTED_PLATFORMS");
    }
    for (const excluded of ["Telegram", "Snapchat", "Pinterest", "X / Twitter", "Reddit"]) {
      expect([typesSource, platformSource, studioSource].join("\n")).not.toContain(excluded);
    }
  });

  it("supports approve and reject asset actions wired to backend mutations", () => {
    expect(studioSource).toContain("approveMarketingDraft");
    expect(studioSource).toContain("rejectMarketingDraft");
  });

  it("supports delete media action wired to backend mutation", () => {
    expect(studioSource).toContain("deleteMediaAsset.mutate");
  });

  it("preview panel shows empty state message when nothing is selected", () => {
    expect(previewSource).toContain("Your preview will appear here once The Marketing App creates or selects something.");
  });

  it("routes prompt quality controls through TheMarketingApp", () => {
    expect(studioSource).toContain("promptControls");
  });
});

