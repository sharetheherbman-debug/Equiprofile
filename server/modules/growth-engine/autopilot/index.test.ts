import { describe, expect, it } from "vitest";
import { buildAutopilotPlan } from "./index";

describe("autopilot campaign orchestration", () => {
  it("builds balanced autopilot plans with workflow chain", () => {
    const plan = buildAutopilotPlan({
      prompt: "Create a 30-second Facebook reel for UK stable owners",
      settings: {
        enabled: true,
        approveBeforePost: true,
        frequency: "weekly",
        platforms: ["Facebook", "Instagram"],
        goals: ["lead_generation"],
        mode: "Balanced",
      },
    });

    expect(plan.cadencePerWeek).toBe(4);
    expect(plan.workflowId).toBeTruthy();
    expect(plan.actions).toContain("generate_campaigns");
    expect(plan.actions).toContain("wait_for_approval");
  });
});
