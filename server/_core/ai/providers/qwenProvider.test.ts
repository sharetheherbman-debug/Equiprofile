import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runtimeValues: {} as Record<string, string>,
}));

vi.mock("../../../dynamicConfig", () => ({
  getRuntimeConfig: vi.fn(async (settingKey: string, envVar: string) => mocks.runtimeValues[settingKey] ?? mocks.runtimeValues[envVar] ?? ""),
}));

import {
  executeQwenTask,
  isQwenTaskExecutableViaCurrentRuntime,
  qwenUnsupportedTaskReason,
  resolveQwenConfig,
} from "./qwenProvider";

describe("Qwen capability-based provider", () => {
  beforeEach(() => {
    Object.keys(mocks.runtimeValues).forEach((key) => delete mocks.runtimeValues[key]);
    vi.unstubAllGlobals();
  });

  it("uses task-specific text model when configured", async () => {
    mocks.runtimeValues.qwen_api_key = "qwen-key";
    mocks.runtimeValues.qwen_text_model = "qwen-max";

    const config = await resolveQwenConfig("copywriting");

    expect(config.model).toBe("qwen-max");
    expect(config.endpoint).toContain("/chat/completions");
  });

  it("no longer hard-blocks non-chat executable tasks such as embeddings", async () => {
    expect(isQwenTaskExecutableViaCurrentRuntime("embeddings")).toBe(true);
    expect(isQwenTaskExecutableViaCurrentRuntime("text_to_video")).toBe(false);
    expect(qwenUnsupportedTaskReason("text_to_video")).toContain("DashScope-native media endpoint");
  });

  it("executes Qwen embeddings through the OpenAI-compatible embeddings endpoint", async () => {
    mocks.runtimeValues.qwen_api_key = "qwen-key";
    mocks.runtimeValues.qwen_embedding_model = "text-embedding-v4";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [{ embedding: [0.1] }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeQwenTask("embeddings", { input: "stable management" }, 1000);

    expect(result.model).toBe("text-embedding-v4");
    expect(result.endpointFamily).toBe("dashscope_openai_embeddings");
    expect(fetchMock.mock.calls[0][0]).toContain("/embeddings");
  });
});
