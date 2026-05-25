import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const runtimeValues: Record<string, string> = {};
  return {
    runtimeValues,
    executeGenXTask: vi.fn(),
    testRawGenXConnection: vi.fn(),
    testGenXTextGeneration: vi.fn(),
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
  resolveGenXConfig: vi.fn(async () => {
    const base = mocks.runtimeValues.genx_base_url ?? mocks.runtimeValues.GENX_BASE_URL ?? "";
    return {
      endpoint: base ? `${base.replace(/\/$/, "")}/v1/chat/completions` : "",
      model: "genx-core-reasoner",
    };
  }),
  testRawGenXConnection: mocks.testRawGenXConnection,
  testGenXTextGeneration: mocks.testGenXTextGeneration,
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

import { executeWithFallback, isProviderAvailableForTask, resetProviderRuntimeForTests } from "./providerRegistry";

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
    mocks.testRawGenXConnection.mockReset();
    mocks.testRawGenXConnection.mockResolvedValue({ provider: "genx", status: "success", statusCode: 200, endpoint: "https://genx.local/v1/chat/completions", latencyMs: 10, responseSummary: "ok" });
    mocks.testGenXTextGeneration.mockReset();
    mocks.testGenXTextGeneration.mockResolvedValue({ provider: "genx", status: "success", statusCode: 200, endpoint: "https://genx.local/v1/chat/completions", model: "genx-core-reasoner", latencyMs: 10, preview: "ok" });
    mocks.executeQwenTask.mockReset();
    mocks.executeHuggingFaceTask.mockReset();
    mocks.recordFailure.mockReset();
    resetProviderRuntimeForTests();
  });

  it("uses GenX for copywriting when GenX is configured", async () => {
    mocks.runtimeValues.genx_api_key = "genx-key";
    mocks.runtimeValues.genx_base_url = "https://genx.local";
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
    mocks.runtimeValues.genx_base_url = "https://genx.local";
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

  it("requires a successful GenX live test before marking copywriting available", async () => {
    mocks.runtimeValues.genx_api_key = "genx-key";
    mocks.runtimeValues.genx_base_url = "https://genx.local";

    await expect(isProviderAvailableForTask("genx", "copywriting")).resolves.toBe(true);
    expect(mocks.testGenXTextGeneration).toHaveBeenCalledTimes(1);
  });

  it("does not treat a GenX key as ready when the endpoint test fails", async () => {
    mocks.runtimeValues.genx_api_key = "genx-key";
    mocks.runtimeValues.genx_base_url = "https://wrong-genx.local";
    mocks.testGenXTextGeneration.mockRejectedValueOnce(new Error("GenX request failed (404) at https://wrong-genx.local/v1/chat/completions"));
    mocks.testRawGenXConnection.mockResolvedValueOnce({
      provider: "genx",
      status: "failed",
      statusCode: 404,
      endpoint: "https://wrong-genx.local/v1/chat/completions",
      latencyMs: 20,
      responseSummary: "Not found",
    });

    await expect(isProviderAvailableForTask("genx", "copywriting")).resolves.toBe(false);
  });

  it("does not execute GenX draft generation when its live test fails", async () => {
    mocks.runtimeValues.genx_api_key = "genx-key";
    mocks.runtimeValues.genx_base_url = "https://wrong-genx.local";
    mocks.testGenXTextGeneration.mockRejectedValueOnce(new Error("GenX request failed (503) at https://wrong-genx.local/v1/chat/completions"));
    mocks.testRawGenXConnection.mockResolvedValueOnce({
      provider: "genx",
      status: "failed",
      statusCode: 503,
      endpoint: "https://wrong-genx.local/v1/chat/completions",
      latencyMs: 20,
      responseSummary: "Unavailable",
    });

    await expect(executeWithFallback(["genx"], "copywriting", { prompt: "campaign" }, 1000)).rejects.toMatchObject({
      name: "ProviderSelectionError",
      code: "provider_missing",
    });
    expect(mocks.executeGenXTask).not.toHaveBeenCalled();
  });
});
