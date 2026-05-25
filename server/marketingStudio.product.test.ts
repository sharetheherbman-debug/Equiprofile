import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminCampaigns.tsx"), "utf8");
const previewSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/PlatformPreview.tsx"), "utf8");
const adminSource = readFileSync(resolve(process.cwd(), "client/src/pages/Admin.tsx"), "utf8");

describe("Marketing Studio product shell", () => {
  it("keeps generic admin KPI cards out of the Marketing Studio module", () => {
    expect(adminSource).toContain('if (activeSection === "campaigns")');
    expect(studioSource).not.toContain("Total Users");
    expect(studioSource).not.toContain("Paid Subscribers");
    expect(studioSource).not.toContain("Total Horses");
    expect(studioSource).not.toContain("Overdue Payments");
    expect(studioSource).not.toContain("Admin Dashboard");
  });

  it("renders the required platform connection cards without adding a duplicate social system", () => {
    expect(studioSource).toContain("PLATFORM_CONNECTION_CARDS");
    for (const label of ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Google Business", "Email"]) {
      expect(studioSource).toContain(label);
    }
    expect(studioSource).toContain("trpc.growthEngine.updateSocialConnection");
    expect(studioSource).toContain('platform.growthPlatform !== "email"');
  });

  it("includes the EquiProfile UK Equestrian SaaS Brand DNA preset and guardrails", () => {
    expect(studioSource).toContain("EQUIPROFILE_BRAND_PRESET");
    expect(studioSource).toContain("EquiProfile UK Equestrian SaaS");
    expect(studioSource).toContain("UK stable owners");
    expect(studioSource).toContain("riding schools");
    expect(studioSource).toContain("fake accreditation");
    expect(studioSource).toContain("guaranteed growth claims");
    expect(studioSource).toContain("Brand DNA");
  });

  it("includes command-first result rendering and provider setup state", () => {
    expect(studioSource).toContain("Create a 30-second Facebook reel for UK stable owners.");
    expect(studioSource).toContain("Generated Response");
    expect(studioSource).toContain("Campaign Brief");
    expect(studioSource).toContain("Studio Chat");
    expect(studioSource).toContain("Preview + Actions");
    expect(studioSource).toContain("Shot list");
    expect(studioSource).toContain("AI setup required - add a GenX API key");
    expect(studioSource).toContain("AI team progress");
    expect(studioSource).toContain("blocked");
    expect(studioSource).toContain("active");
    expect(studioSource).toContain("complete");
    expect(studioSource).toContain("waiting");
    expect(studioSource).toContain("setDraft(data.draft as DraftPayload)");
  });

  it("keeps normal provider setup key-first and hides advanced repair by default", () => {
    expect(studioSource).toContain("Connect GenX");
    expect(studioSource).toContain("Connect Hugging Face");
    expect(studioSource).toContain("Connect Qwen");
    expect(studioSource).toContain("Show advanced");
    expect(studioSource).toContain("Advanced provider repair");
    for (const key of [
      "genx_api_key",
      "genx_base_url",
      "genx_model",
      "huggingface_api_key",
      "hf_task_text_to_image_model",
      "hf_task_text_to_video_model",
      "hf_task_avatar_video_model",
      "hf_task_copywriting_model",
      "qwen_api_key",
      "qwen_base_url",
      "qwen_model",
    ]) {
      expect(studioSource).toContain(key);
    }
    expect(studioSource).not.toContain("Technical provider settings");
  });

  it("keeps Audience useful with add/search/list/export and suppression controls", () => {
    expect(studioSource).toContain("Add contact");
    expect(studioSource).toContain("Search contacts");
    expect(studioSource).toContain("Export CSV");
    expect(studioSource).toContain("Suppression warning");
    expect(studioSource).toContain("trpc.admin.createMarketingContact");
    expect(studioSource).toContain("trpc.admin.addSuppression");
  });

  it("renders a dedicated platform preview for Facebook reel drafts", () => {
    expect(studioSource).toContain("PlatformPreview");
    expect(previewSource).toContain("Facebook");
    expect(previewSource).toContain("Draft mode");
    expect(previewSource).toContain("Media direction");
  });
});
