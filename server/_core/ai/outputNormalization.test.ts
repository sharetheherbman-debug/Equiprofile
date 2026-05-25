import { describe, expect, it } from "vitest";
import { normalizeProviderOutput } from "./outputNormalization";
import type { AITask, AIProviderName } from "./types";

function mkInput(output: unknown, task: AITask = "text_to_image", provider: AIProviderName = "huggingface") {
  return {
    output,
    provider,
    model: "test-model",
    task,
    latencyMs: 120,
  };
}

describe("normalizeProviderOutput", () => {
  it("marks prompt/text-only outputs as prompt_only", () => {
    const result = normalizeProviderOutput(mkInput({ text: "Prompt ready" }, "copywriting", "genx"));
    expect(result.resultType).toBe("text");
  });

  it("normalizes URL output for media tasks", () => {
    const result = normalizeProviderOutput(
      mkInput({ url: "https://example.com/video.mp4" }, "text_to_video", "huggingface"),
    );
    expect(result.resultType).toBe("url");
    expect(result.mimeType).toBe("video/mp4");
  });

  it("normalizes provider job pending output", () => {
    const result = normalizeProviderOutput(
      mkInput({ providerJobId: "job_123", status: "queued" }, "text_to_video", "genx"),
    );
    expect(result.resultType).toBe("job_pending");
    expect(result.providerJobId).toBe("job_123");
  });

  it("normalizes base64 output", () => {
    const result = normalizeProviderOutput(
      mkInput({ base64: "a".repeat(200), mimeType: "image/png" }, "text_to_image", "huggingface"),
    );
    expect(result.resultType).toBe("base64");
    expect(result.fileExtension).toBe("png");
  });
});
