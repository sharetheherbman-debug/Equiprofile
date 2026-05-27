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
});
