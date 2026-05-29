import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const routersSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const promptBuilderSource = readFileSync(resolve(process.cwd(), "server/modules/growth-engine/marketingPromptBuilder.ts"), "utf8");
const studioSource = readFileSync(resolve(process.cwd(), "client/src/components/marketing/app/TheMarketingApp.tsx"), "utf8");

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
    expect(studioSource).toContain("setDraft(nextDraft)");
  });

  it("uses the same provider execution path for marketing drafts and sets safe marketing token budget", () => {
    expect(routersSource).toContain('task: "copywriting"');
    expect(routersSource).toContain('agentId: "StrategyAgent"');
    expect(routersSource).toContain("max_tokens: 900");
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
    expect(routersSource).toContain("provider_failed");
  });

  it("routes video intent into media job creation and does not render raw provider JSON as copy", () => {
    expect(routersSource).toContain("inferMediaTaskFromMarketingInput");
    expect(routersSource).toContain('return "text_to_video"');
    expect(routersSource).toContain("recommendedMediaTask");
    expect(routersSource).toContain("raw provider payload was not saved as user content");
    expect(routersSource).not.toContain("return JSON.stringify(payload, null, 2)");
    expect(studioSource).toContain("inferMediaTask(command)");
    expect(studioSource).toContain("queueMedia(requestedMediaTask, null, trimmed)");
    expect(studioSource.indexOf("queueMedia(requestedMediaTask, null, trimmed)")).toBeLessThan(studioSource.indexOf("createDraft.mutate"));
  });

  it("keeps media job calls on the same admin-unlocked security contract as draft generation", () => {
    expect(routersSource).toContain("createMarketingDraft: adminUnlockedProcedure");
    expect(routersSource).toContain("createMediaJob: adminUnlockedProcedure");
    expect(routersSource).toContain("testGenXMediaGeneration: adminUnlockedProcedure");
  });

  it("returns scene_plan_required for 3-minute requests with assembly planning details", () => {
    expect(routersSource).toContain('z.enum(["5", "10", "15", "30", "60", "180"])');
    expect(routersSource).toContain("scene_plan_required");
    expect(routersSource).toContain("narrationPlan");
    expect(routersSource).toContain("subtitlePlan");
    expect(routersSource).toContain("assemblyPlan");
  });
});
