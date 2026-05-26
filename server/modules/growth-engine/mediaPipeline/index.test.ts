import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeAITask: vi.fn(),
}));

vi.mock("../../../_core/ai/orchestrator", () => ({
  executeAITask: mocks.executeAITask,
}));

import { runMediaPipeline } from "./index";

describe("media pipeline persistence", () => {
  beforeEach(() => {
    mocks.executeAITask.mockReset();
  });

  it("returns pending status for queued jobs without duplicating media asset writes", async () => {
    mocks.executeAITask.mockResolvedValue({
      status: "queued",
      task: "text_to_image",
      jobId: "job_1",
      provider: "huggingface",
    });

    const result = await runMediaPipeline({
      capability: "image_generation",
      prompt: "Create hero image",
      tenantScope: { tenantType: "stable", tenantId: "global", initiatedByUserId: 1 },
      draftId: "draft-1",
    });

    expect(result.truthfulStatus).toBe("pending");
    expect(mocks.executeAITask).toHaveBeenCalledTimes(1);
  });

  it("returns truthful prompt-only status for storyboard generation", async () => {
    const result = await runMediaPipeline({
      capability: "storyboard_generation",
      prompt: "Storyboard the campaign",
      tenantScope: { tenantType: "stable", tenantId: "global", initiatedByUserId: 1 },
    });

    expect(result.truthfulStatus).toBe("prompt_only");
    expect(mocks.executeAITask).not.toHaveBeenCalled();
  });
});
