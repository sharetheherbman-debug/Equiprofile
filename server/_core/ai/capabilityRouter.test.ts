import { describe, expect, it } from "vitest";
import { getAgentTimelineForIntent, getCapabilityPlan, inferProductIntent } from "./capabilityRouter";

describe("capabilityRouter", () => {
  it("maps a Facebook reel command to the facebook_reel product intent", () => {
    expect(inferProductIntent({
      platform: "Facebook",
      format: "reel",
      prompt: "Create a 30-second Facebook reel for UK stable owners.",
    })).toBe("facebook_reel");
  });

  it("routes text strategy through GenX first with Qwen then Hugging Face fallback", async () => {
    process.env.GENX_MODEL = "gpt-5.4";
    const plan = await getCapabilityPlan("email_campaign");
    expect(plan.primaryProvider).toBe("genx");
    expect(plan.fallbackProviders).toEqual(expect.arrayContaining(["qwen", "huggingface"]));
    expect(plan.steps.map((step) => step.agentId)).toContain("StrategyAgent");
    expect(plan.steps.map((step) => step.agentId)).toContain("CopyAgent");
    delete process.env.GENX_MODEL;
  });

  it("marks reel media as playable_if_ready with truthful provider-dependent output", async () => {
    const plan = await getCapabilityPlan("facebook_reel");
    expect(plan.mediaMode).toBe("playable_if_ready");
    expect(plan.steps.some((step) => step.task === "text_to_video" && step.agentId === "MediaAgent")).toBe(true);
  });

  it("exposes a simple AI team timeline without provider/model details", async () => {
    const timeline = await getAgentTimelineForIntent("facebook_reel");
    expect(timeline.map((step) => step.label)).toEqual([
      "Strategist",
      "Creative Director",
      "Copywriter",
      "Media",
      "Compliance",
      "Scheduler",
      "Platform Intelligence",
    ]);
    expect(JSON.stringify(timeline)).not.toContain("base_url");
    expect(JSON.stringify(timeline)).not.toContain("model");
  });
});
