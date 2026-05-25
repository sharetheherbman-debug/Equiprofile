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

  it("routes text strategy through GenX first with Qwen then Hugging Face fallback", () => {
    const plan = getCapabilityPlan("email_campaign");
    expect(plan.primaryProvider).toBe("genx");
    expect(plan.fallbackProviders).toEqual(["qwen", "huggingface"]);
    expect(plan.steps.map((step) => step.agentId)).toContain("StrategyAgent");
    expect(plan.steps.map((step) => step.agentId)).toContain("CopyAgent");
  });

  it("keeps reel media prompt-only unless a playable media provider is ready", () => {
    const plan = getCapabilityPlan("facebook_reel");
    expect(plan.mediaMode).toBe("prompt_only");
    expect(plan.steps.some((step) => step.task === "text_to_video" && step.agentId === "MediaAgent")).toBe(true);
  });

  it("exposes a simple AI team timeline without provider/model details", () => {
    const timeline = getAgentTimelineForIntent("facebook_reel");
    expect(timeline.map((step) => step.label)).toEqual([
      "Strategist",
      "Copywriter",
      "Creative Director",
      "Media Agent",
      "Compliance",
      "Scheduler",
    ]);
    expect(JSON.stringify(timeline)).not.toContain("base_url");
    expect(JSON.stringify(timeline)).not.toContain("model");
  });
});
