import { describe, expect, it } from "vitest";
import { buildMarketingGenerationPrompt } from "./marketingPromptBuilder";

describe("buildMarketingGenerationPrompt", () => {
  it("injects brand, avatar and platform strategy context into prompt", () => {
    const prompt = buildMarketingGenerationPrompt({
      platform: "Facebook",
      format: "avatar video",
      goal: "signups",
      tone: "professional",
      durationSeconds: 30,
      userPrompt: "Create a 30-second reel",
      brandContext: "Brand voice: premium\nTarget audience: stable owners\nPrimary CTA: Start free trial\nDo NOT include: guaranteed",
      avatarContext: "Avatar: Emma\nRole: Brand ambassador",
      platformRulesContext: "Hook guidelines for Facebook: Start with pain point",
    });

    expect(prompt).toContain("Brand voice: premium");
    expect(prompt).toContain("Target audience: stable owners");
    expect(prompt).toContain("Primary CTA: Start free trial");
    expect(prompt).toContain("Do NOT include: guaranteed");
    expect(prompt).toContain("Avatar: Emma");
    expect(prompt).toContain("Hook guidelines for Facebook");
  });
});
