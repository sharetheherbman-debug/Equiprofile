import { describe, expect, it } from "vitest";
import { getAgentPolicy, listAgentPolicies } from "./registry";

describe("marketing agent registry", () => {
  it("defines the internal marketing team without user-configurable agents", () => {
    const ids = listAgentPolicies().map((agent) => agent.id);
    expect(ids).toEqual(expect.arrayContaining([
      "StrategyAgent",
      "CopyAgent",
      "CreativeDirectorAgent",
      "MediaAgent",
      "PlatformIntelligenceAgent",
      "ComplianceAgent",
      "SchedulerAgent",
      "LearningAgent",
    ]));
  });

  it("keeps each marketing agent scoped with tasks and fallback-related hooks", () => {
    for (const id of ["StrategyAgent", "CopyAgent", "CreativeDirectorAgent", "SchedulerAgent"] as const) {
      const policy = getAgentPolicy(id);
      expect(policy.purpose.length).toBeGreaterThan(10);
      expect(policy.allowedTasks.length).toBeGreaterThan(0);
      expect(policy.escalationHooks.length).toBeGreaterThan(0);
      expect(policy.timeoutMs).toBeGreaterThan(0);
    }
  });
});
