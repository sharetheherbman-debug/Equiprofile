import { describe, expect, it } from "vitest";
import { compileMarketingPrompt } from "./promptCompiler";

describe("promptCompiler", () => {
  it("turns vague prompts into structured video prompts", () => {
    const compiled = compileMarketingPrompt({
      task: "text_to_video",
      userPrompt: "video",
      quality: "elite",
      requestedDurationSeconds: 15,
    });

    expect(compiled.subject).toContain("equestrian lifestyle");
    expect(compiled.shotPlan.length).toBeGreaterThan(0);
    expect(compiled.prompt).toContain("Shot plan:");
  });

  it("never asks model to render logo/domain/text in raw footage", () => {
    const compiled = compileMarketingPrompt({
      task: "text_to_video",
      userPrompt: "horses running into the sunset with EquiProfile logo and website text",
      quality: "elite",
    });

    expect(compiled.prompt.toLowerCase()).toContain("no text");
    expect(compiled.prompt.toLowerCase()).toContain("no logos");
    expect(compiled.prompt.toLowerCase()).toContain("no watermark");
    expect(compiled.negativePrompt.toLowerCase()).toContain("no written words");
  });

  it("compiles 'horses running into the sunset' into a structured cinematic prompt", () => {
    const compiled = compileMarketingPrompt({
      task: "text_to_video",
      userPrompt: "horses running into the sunset",
      quality: "cinematic",
    });

    // Subject is preserved (not treated as vague)
    expect(compiled.subject).toContain("horses running into the sunset");

    // Style includes cinematic
    expect(compiled.styleProfile).toContain("cinematic");

    // No-text guardrails always present
    expect(compiled.prompt.toLowerCase()).toContain("no text");
    expect(compiled.prompt.toLowerCase()).toContain("no logos");
    expect(compiled.prompt.toLowerCase()).toContain("no watermark");
    expect(compiled.negativePrompt.toLowerCase()).toContain("no written words");
    expect(compiled.negativePrompt.toLowerCase()).toContain("no watermark");

    // Shot plan is populated
    expect(compiled.shotPlan.length).toBeGreaterThan(0);
    expect(compiled.prompt).toContain("Shot plan:");

    // Post-processing branding rule is set
    expect(compiled.rules.noTextInFootage).toBe(true);
    expect(compiled.rules.postProcessBrandingRequired).toBe(true);

    // Raw user prompt is NOT the final provider prompt (it is enriched)
    expect(compiled.prompt).not.toBe("horses running into the sunset");
  });

  it("compiled video prompt always includes no-text/no-logo constraints regardless of input", () => {
    const prompts = [
      "horses running into the sunset",
      "equestrian brand video",
      "make a cool clip",
      "EquiProfile product launch",
    ];
    for (const userPrompt of prompts) {
      const compiled = compileMarketingPrompt({ task: "text_to_video", userPrompt });
      expect(compiled.prompt.toLowerCase()).toContain("no text");
      expect(compiled.prompt.toLowerCase()).toContain("no logos");
      expect(compiled.negativePrompt.toLowerCase()).toContain("no written words");
    }
  });

  it("applies prompt quality controls through the compiler contract", () => {
    const compiled = compileMarketingPrompt({
      task: "text_to_video",
      userPrompt: "Create a stable showcase video",
      requestedDurationSeconds: 60,
      promptControls: ["more_cinematic", "no_people", "horse_showcase"],
    });
    expect(compiled.durationSeconds).toBe(60);
    expect(compiled.appliedControls).toEqual(expect.arrayContaining(["more_cinematic", "no_people", "horse_showcase"]));
    expect(compiled.prompt).toContain("Control directives:");
    expect(compiled.prompt).toContain("horse-focused footage");
  });

  it("adds horse relevance guardrails for horse-focused requests", () => {
    const compiled = compileMarketingPrompt({
      task: "text_to_video",
      userPrompt: "Create a horse video for stable owners",
      quality: "elite",
    });
    expect(compiled.prompt.toLowerCase()).toContain("subject lock: horses/equestrian");
    expect(compiled.negativePrompt.toLowerCase()).toContain("no office laptop scenes");
    expect(compiled.negativePrompt.toLowerCase()).toContain("no non-latin written characters");
  });

  it("adds fighter-jet relevance guardrails for aircraft requests", () => {
    const compiled = compileMarketingPrompt({
      task: "text_to_video",
      userPrompt: "Create a fighter jet launch clip",
      quality: "elite",
    });
    expect(compiled.prompt.toLowerCase()).toContain("subject lock: fighter jet aircraft");
    expect(compiled.negativePrompt.toLowerCase()).toContain("no horses");
    expect(compiled.negativePrompt.toLowerCase()).toContain("no office desk setup");
  });
});
