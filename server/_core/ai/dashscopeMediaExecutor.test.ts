import { describe, expect, it } from "vitest";
import { executeDashscopeMediaTask } from "./dashscopeMediaExecutor";

describe("dashscopeMediaExecutor", () => {
  it("returns setup_needed truthfully while native execution is incomplete", async () => {
    const result = await executeDashscopeMediaTask("text_to_video");
    expect(result.status).toBe("setup_needed");
    expect(result.message).toMatch(/setup_needed/i);
  });
});
