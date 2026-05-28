import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRuntimeConfig: vi.fn(async (_key: string, envVar: string) => process.env[envVar] ?? ""),
  getRuntimeConfigMode: vi.fn(() => "unit_test_mock" as const),
  fetch: vi.fn(),
}));

vi.mock("../../dynamicConfig", () => ({
  getRuntimeConfig: mocks.getRuntimeConfig,
  getRuntimeConfigMode: mocks.getRuntimeConfigMode,
}));

vi.stubGlobal("fetch", mocks.fetch);

import { executeChatTask, isChatProviderConfigured, isChatSetupNeeded } from "./chatOrchestrator";

const makeJsonResponse = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

describe("chatOrchestrator", () => {
  beforeEach(() => {
    mocks.fetch.mockReset();
    mocks.getRuntimeConfig.mockImplementation(async (_key: string, envVar: string) => process.env[envVar] ?? "");
    mocks.getRuntimeConfigMode.mockReturnValue("unit_test_mock");
    delete process.env.GENX_API_KEY;
    delete process.env.QWEN_API_KEY;
    delete process.env.HUGGINGFACE_API_KEY;
    delete process.env.HF_TASK_COPYWRITING_MODEL;
  });

  it("returns setup_needed when no provider key is configured", async () => {
    const result = await executeChatTask([{ role: "user", content: "Hello" }]);
    expect(isChatSetupNeeded(result)).toBe(true);
    if (isChatSetupNeeded(result)) {
      expect(result.message).toContain("No text provider");
    }
  });

  it("calls GenX chat endpoint when GENX_API_KEY is set", async () => {
    mocks.getRuntimeConfig.mockImplementation(async (_key: string, envVar: string) => {
      if (envVar === "GENX_API_KEY") return "test-genx-key";
      if (envVar === "GENX_TEXT_MODEL" || envVar === "GENX_DEFAULT_MODEL" || envVar === "GENX_MODEL") return "";
      if (envVar === "GENX_BASE_URL") return "";
      if (envVar === "COPYWRITING_PROVIDER") return "";
      return "";
    });
    mocks.fetch.mockResolvedValue(
      makeJsonResponse({ choices: [{ message: { content: "Hello! I can help you." } }] }),
    );

    const result = await executeChatTask([{ role: "user", content: "Hello, can you help me?" }]);

    expect(isChatSetupNeeded(result)).toBe(false);
    if (!isChatSetupNeeded(result)) {
      expect(result.provider).toBe("genx");
      expect(result.content).toBe("Hello! I can help you.");
    }
    expect(mocks.fetch).toHaveBeenCalledOnce();
    const [url] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/chat/completions");
    const body = JSON.parse((mocks.fetch.mock.calls[0] as [string, RequestInit])[1]?.body as string);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("Hello, can you help me?");
  });

  it("does not call media resolver or video model discovery", async () => {
    mocks.getRuntimeConfig.mockImplementation(async (_key: string, envVar: string) => {
      if (envVar === "GENX_API_KEY") return "test-key";
      return "";
    });
    mocks.fetch.mockResolvedValue(
      makeJsonResponse({ choices: [{ message: { content: "Sure thing!" } }] }),
    );

    await executeChatTask([{ role: "user", content: "What can you do?" }]);

    // Only one fetch call — to the chat endpoint. No video model discovery calls.
    expect(mocks.fetch).toHaveBeenCalledOnce();
    const [url] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("/api/v1/models");
    expect(url).not.toContain("mediaResolver");
  });

  it("falls back to Qwen when GenX key is absent", async () => {
    mocks.getRuntimeConfig.mockImplementation(async (_key: string, envVar: string) => {
      if (envVar === "QWEN_API_KEY") return "test-qwen-key";
      if (envVar === "GENX_API_KEY") return "";
      return "";
    });
    mocks.fetch.mockResolvedValue(
      makeJsonResponse({ choices: [{ message: { content: "Qwen says hi." } }] }),
    );

    const result = await executeChatTask([{ role: "user", content: "Hey" }]);

    expect(isChatSetupNeeded(result)).toBe(false);
    if (!isChatSetupNeeded(result)) {
      expect(result.provider).toBe("qwen");
    }
  });

  it("isChatProviderConfigured returns false when no env key set in unit_test_mock", async () => {
    mocks.getRuntimeConfigMode.mockReturnValue("unit_test_mock");
    const configured = await isChatProviderConfigured();
    expect(configured).toBe(false);
  });

  it("isChatProviderConfigured returns true when GENX_API_KEY is in env", async () => {
    mocks.getRuntimeConfigMode.mockReturnValue("unit_test_mock");
    process.env.GENX_API_KEY = "test-key";
    const configured = await isChatProviderConfigured();
    expect(configured).toBe(true);
  });

  it("media setup_needed does not block chat when a text provider is configured", async () => {
    // Simulates: HF/Qwen media is setup_needed, but GenX text works
    mocks.getRuntimeConfig.mockImplementation(async (_key: string, envVar: string) => {
      if (envVar === "GENX_API_KEY") return "test-genx-key";
      return "";
    });
    mocks.fetch.mockResolvedValue(
      makeJsonResponse({ choices: [{ message: { content: "Chat works fine." } }] }),
    );

    // chatOrchestrator never checks HF network or Qwen media, so no setup_needed
    const result = await executeChatTask([{ role: "user", content: "Does chat work?" }]);
    expect(isChatSetupNeeded(result)).toBe(false);
    if (!isChatSetupNeeded(result)) {
      expect(result.content).toBe("Chat works fine.");
    }
  });
});
