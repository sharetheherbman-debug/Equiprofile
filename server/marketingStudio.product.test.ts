import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminCampaigns.tsx"), "utf8");
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
  });

  it("keeps Audience useful with add/search/list/export and suppression controls", () => {
    expect(studioSource).toContain("Add contact");
    expect(studioSource).toContain("Search contacts");
    expect(studioSource).toContain("Export CSV");
    expect(studioSource).toContain("Suppression warning");
    expect(studioSource).toContain("trpc.admin.createMarketingContact");
    expect(studioSource).toContain("trpc.admin.addSuppression");
  });
});
