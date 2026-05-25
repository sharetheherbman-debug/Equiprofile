import { describe, expect, it } from "vitest";
import { getCampaignTemplate, listCampaignTemplates } from "./index";

describe("campaign template registry", () => {
  it("contains all required prebuilt templates", () => {
    const names = listCampaignTemplates().map((template) => template.name);
    for (const name of [
      "Stable launch campaign",
      "Riding school campaign",
      "Academy launch campaign",
      "Weekly social pack",
      "Email nurture campaign",
      "Product launch",
      "Reactivation campaign",
      "Referral campaign",
      "YouTube growth campaign",
      "TikTok/Reel growth campaign",
    ]) {
      expect(names).toContain(name);
    }
  });

  it("returns template by id", () => {
    const template = getCampaignTemplate("weekly_social_pack");
    expect(template?.platformMix.length).toBeGreaterThan(0);
    expect(template?.aiWorkflowChain.length).toBeGreaterThan(0);
  });
});
