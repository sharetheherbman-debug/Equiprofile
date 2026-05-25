import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const runtimeValues: Record<string, string> = {};
  return {
    runtimeValues,
    executeGenXTask: vi.fn(),
    executeQwenTask: vi.fn(),
    executeHuggingFaceTask: vi.fn(),
    recordFailure: vi.fn(),
  };
});

vi.mock("../../../dynamicConfig", () => ({
  getRuntimeConfig: vi.fn(async (settingKey: string, envVar: string) => mocks.runtimeValues[settingKey] ?? mocks.runtimeValues[envVar] ?? ""),
}));

vi.mock("./genxProvider", () => ({
  executeGenXTask: mocks.executeGenXTask,
  resolveGenXConfig: vi.fn(async () => ({ endpoint: "https://api.genx.ai/v1/chat/completions", model: "genx-core-reasoner" })),
  testGenXTextGeneration: vi.fn(async () => ({ provider: "genx", status: "success" })),
}));

vi.mock("./qwenProvider", () => ({
  executeQwenTask: mocks.executeQwenTask,
  resolveQwenConfig: vi.fn(async () => ({ endpoint: "https://qwen.local/v1/chat/completions", model: "qwen-plus" })),
  testQwenTextGeneration: vi.fn(async () => ({ provider: "qwen", status: "success" })),
}));

vi.mock("./huggingFaceProvider", () => ({
  executeHuggingFaceTask: mocks.executeHuggingFaceTask,
  resolveHuggingFaceTaskModel: vi.fn(async (task: string) => {
    if (task === "copywriting") {
      return mocks.runtimeValues.hf_task_copywriting_model ?? mocks.runtimeValues.HF_TASK_COPYWRITING_MODEL ?? "";
    }
    return "hf-model";
  }),
  testHuggingFaceProvider: vi.fn(async () => ({ provider: "huggingface", status: "success" })),
}));

vi.mock("../analytics/usageAnalytics", () => ({
  aiUsageAnalytics: {
    recordUsage: vi.fn(),
    recordFailure: mocks.recordFailure,
  },
}));

import { executeWithFallback, isProviderAvailableForTask } from "./providerRegistry";

function mkResult(provider: "genx" | "qwen" | "huggingface") {
  return {
    provider,
    task: "copywriting" as const,
    model: `${provider}-model`,
    output: { text: `from ${provider}` },
    latencyMs: 10,
  };
}

describe("providerRegistry fallback routing", () => {
  beforeEach(() => {
    Object.keys(mocks.runtimeValues).forEach((k) => delete mocks.runtimeValues[k]);
    mocks.executeGenXTask.mockReset();
    mocks.executeQwenTask.mockReset();
    mocks.executeHuggingFaceTask.mockReset();
    mocks.recordFailure.mockReset();
  });

  it("uses GenX for copywriting when GenX is configured", async () => {
    mocks.runtimeValues.genx_api_key = "genx-key";
    mocks.runtimeValues.qwen_api_key = "qwen-key";
    mocks.runtimeValues.huggingface_api_key = "hf-key";
    mocks.runtimeValues.hf_task_copywriting_model = "hf/copy";
    mocks.executeGenXTask.mockResolvedValueOnce(mkResult("genx"));

    const result = await executeWithFallback(["genx", "qwen", "huggingface"], "copywriting", { prompt: "x" }, 1000);

    expect(result.provider).toBe("genx");
    expect(mocks.executeGenXTask).toHaveBeenCalledTimes(1);
    expect(mocks.executeQwenTask).not.toHaveBeenCalled();
    expect(mocks.executeHuggingFaceTask).not.toHaveBeenCalled();
  });

  it("falls back to Qwen when GenX is missing and Qwen is configured", async () => {
    mocks.runtimeValues.qwen_api_key = "qwen-key";
    mocks.executeQwenTask.mockResolvedValueOnce(mkResult("qwen"));

    const result = await executeWithFallback(["genx", "qwen", "huggingface"], "copywriting", { prompt: "x" }, 1000);

    expect(result.provider).toBe("qwen");
    expect(mocks.executeGenXTask).not.toHaveBeenCalled();
    expect(mocks.executeQwenTask).toHaveBeenCalledTimes(1);
  });

  it("falls back to Hugging Face when GenX/Qwen are missing and HF copywriting model is configured", async () => {
    mocks.runtimeValues.huggingface_api_key = "hf-key";
    mocks.runtimeValues.hf_task_copywriting_model = "hf/copy";
    mocks.executeHuggingFaceTask.mockResolvedValueOnce(mkResult("huggingface"));

    const result = await executeWithFallback(["genx", "qwen", "huggingface"], "copywriting", { prompt: "x" }, 1000);

    expect(result.provider).toBe("huggingface");
    expect(mocks.executeHuggingFaceTask).toHaveBeenCalledTimes(1);
  });

  it("returns provider_missing when no provider is configured", async () => {
    await expect(
      executeWithFallback(["genx", "qwen", "huggingface"], "copywriting", { prompt: "x" }, 1000),
    ).rejects.toMatchObject({ name: "ProviderSelectionError", code: "provider_missing" });
  });

  it("does not attempt HF if GenX succeeds even when HF would fail", async () => {
    mocks.runtimeValues.genx_api_key = "genx-key";
    mocks.runtimeValues.huggingface_api_key = "hf-key";
    mocks.runtimeValues.hf_task_copywriting_model = "hf/copy";
    mocks.executeGenXTask.mockResolvedValueOnce(mkResult("genx"));
    mocks.executeHuggingFaceTask.mockRejectedValueOnce(new Error("Provider network fetch failed"));

    const result = await executeWithFallback(["genx", "qwen", "huggingface"], "copywriting", { prompt: "x" }, 1000);

    expect(result.provider).toBe("genx");
    expect(mocks.executeHuggingFaceTask).not.toHaveBeenCalled();
  });

  it("marks HF copywriting unavailable when explicit model is missing", async () => {
    mocks.runtimeValues.huggingface_api_key = "hf-key";

    await expect(isProviderAvailableForTask("huggingface", "copywriting")).resolves.toBe(false);
  });
});
