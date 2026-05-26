import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const routersSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const promptBuilderSource = readFileSync(resolve(process.cwd(), "server/modules/growth-engine/marketingPromptBuilder.ts"), "utf8");
const studioSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminCampaigns.tsx"), "utf8");

describe("Marketing draft output and media truth contract", () => {
  it("requests and normalizes structured campaign output for command-first rendering", () => {
    for (const key of [
      "title",
      "platform",
      "format",
      "durationSeconds",
      "audience",
      "goal",
      "strategy",
      "hook",
      "script",
      "shotList",
      "caption",
      "cta",
      "hashtags",
      "visualDirection",
      "voiceoverScript",
      "recommendedSchedule",
      "complianceNotes",
      "growthScore",
      "mediaPlan",
      "nextActions",
    ]) {
      expect(promptBuilderSource).toContain(key);
      expect(routersSource).toContain(key);
    }
    expect(studioSource).toContain("setDraft(data.draft as DraftPayload)");
  });

  it("uses the same provider execution path for marketing drafts and sets safe marketing token budget", () => {
    expect(routersSource).toContain('task: "copywriting"');
    expect(routersSource).toContain('agentId: "StrategyAgent"');
    expect(routersSource).toContain("max_tokens: 512");
    expect(routersSource).not.toContain("gpt-5.4-turbo");
    expect(routersSource).not.toContain("openai/gpt-4.1-mini");
  });

  it("keeps media capabilities truthful and separates setup-needed from provider failure", () => {
    for (const state of [
      "working_real_asset",
      "provider_config_missing",
      "model_config_missing",
      "provider_failed",
      "setup_needed",
    ]) {
      expect(routersSource).toContain(state);
    }
    expect(routersSource).toContain("hf_task_text_to_image_model");
    expect(routersSource).toContain("hf_task_text_to_video_model");
    expect(routersSource).toContain("hf_task_avatar_video_model");
    expect(routersSource).toContain("Media setup needed");
    expect(routersSource).toContain("Media provider failed");
  });
});
