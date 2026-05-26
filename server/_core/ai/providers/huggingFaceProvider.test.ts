import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runtimeValues: {} as Record<string, string>,
}));

vi.mock("../../../dynamicConfig", () => ({
  getRuntimeConfig: vi.fn(async (settingKey: string, envVar: string) => mocks.runtimeValues[settingKey] ?? mocks.runtimeValues[envVar] ?? ""),
}));

import { executeHuggingFaceTask, resolveHuggingFaceTaskModels } from "./huggingFaceProvider";

describe("Hugging Face model fleet routing", () => {
  beforeEach(() => {
    Object.keys(mocks.runtimeValues).forEach((key) => delete mocks.runtimeValues[key]);
    vi.unstubAllGlobals();
  });

  it("supports comma-separated fallback models per task", async () => {
    mocks.runtimeValues.hf_task_text_to_video_models = "model/a, model/b";

    await expect(resolveHuggingFaceTaskModels("text_to_video")).resolves.toEqual(["model/a", "model/b"]);
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
});
