import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runtimeValues: {} as Record<string, string>,
  dnsLookup: vi.fn(async () => ({ address: "127.0.0.1", family: 4 })),
}));

vi.mock("../../../dynamicConfig", () => ({
  getRuntimeConfig: vi.fn(async (settingKey: string, envVar: string) => mocks.runtimeValues[settingKey] ?? mocks.runtimeValues[envVar] ?? ""),
}));

vi.mock("node:dns", () => ({
  promises: {
    lookup: mocks.dnsLookup,
  },
}));

import {
  executeHuggingFaceTask,
  getHuggingFaceRoutingDiagnostics,
  resolveHuggingFacePipelineRouting,
  resolveHuggingFaceTaskModelResolution,
  resolveHuggingFaceTaskModels,
} from "./huggingFaceProvider";

describe("Hugging Face model fleet routing", () => {
  beforeEach(() => {
    Object.keys(mocks.runtimeValues).forEach((key) => delete mocks.runtimeValues[key]);
    mocks.dnsLookup.mockReset();
    mocks.dnsLookup.mockResolvedValue({ address: "127.0.0.1", family: 4 });
    vi.unstubAllGlobals();
  });

  it("supports comma-separated fallback models per task", async () => {
    mocks.runtimeValues.hf_task_text_to_video_models = "model/a, model/b";

    await expect(resolveHuggingFaceTaskModels("text_to_video")).resolves.toEqual(["model/a", "model/b"]);
  });

  it("reports built-in media defaults as effective Hugging Face model sources", async () => {
    const resolution = await resolveHuggingFaceTaskModelResolution("text_to_video");

    expect(resolution.models).toEqual(["genmo/mochi-1-preview"]);
    expect(resolution.source).toBe("built_in_default");
  });

  it("falls back to the second candidate when the first model fails", async () => {
    mocks.runtimeValues.huggingface_api_key = "hf-key";
    mocks.runtimeValues.hf_task_text_to_image_models = "bad/image, good/image";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "failed" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(Buffer.from("image-bytes"), {
        status: 200,
        headers: { "content-type": "image/png" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeHuggingFaceTask("text_to_image", { prompt: "horse app icon" }, 1000);

    expect(result.model).toBe("good/image");
    expect((result.output as any).resultType).toBe("base64");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resolves task routing by HF pipeline task names, not a single static model string", async () => {
    mocks.runtimeValues.hf_task_text_to_video_model = "video/a";
    mocks.runtimeValues.hf_task_text_to_video_fallbacks = "video/b,video/c";

    const routing = await resolveHuggingFacePipelineRouting("text-to-video");

    expect(routing.task).toBe("text-to-video");
    expect(routing.effectiveModels).toEqual(["video/a", "video/b", "video/c"]);
  });

  it("returns DNS/network diagnostic shape for Hugging Face", async () => {
    mocks.runtimeValues.huggingface_api_key = "hf-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const diagnostics = await getHuggingFaceRoutingDiagnostics();

    expect(diagnostics.provider).toBe("huggingface");
    expect(diagnostics.keyPresent).toBe(true);
    expect(diagnostics.network).toHaveProperty("dns");
    expect(diagnostics.network).toHaveProperty("huggingfaceDotCo");
    expect(diagnostics.network).toHaveProperty("inferenceEndpoint");
    expect(Array.isArray(diagnostics.taskRouting)).toBe(true);
  });
});
