import { describe, expect, it } from "vitest";
import { listWorkflowPipelines, resolveWorkflowForIntent, runWorkflowPipeline } from "./index";

describe("AI agent workflow pipelines", () => {
  it("exposes all required pipelines", () => {
    const ids = listWorkflowPipelines().map((pipeline) => pipeline.id);
    for (const required of [
      "content_generation",
      "launch_campaign",
      "autopilot_growth",
      "reel_generation",
      "email_campaign",
      "educational_campaign",
      "avatar_generation",
      "social_pack_generation",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("resolves reel workflow chain for reel intent", () => {
    const workflow = resolveWorkflowForIntent("facebook_reel");
    expect(workflow.id).toBe("reel_generation");
    expect(workflow.steps.map((step) => step.agentId)).toContain("StrategyAgent");
    expect(workflow.steps.map((step) => step.agentId)).toContain("MediaAgent");
  });

  it("runs workflow and produces structured chained outputs", () => {
    const result = runWorkflowPipeline({ intent: "email_campaign", prompt: "Create an email campaign" });
    expect(result.outputs.strategy).toMatchObject({ status: "completed" });
    expect(result.outputs.compliance).toMatchObject({ status: "completed" });
  });
});
