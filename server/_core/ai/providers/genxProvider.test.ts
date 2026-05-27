import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runtimeValues: {} as Record<string, string>,
}));

vi.mock("../../../dynamicConfig", () => ({
  getRuntimeConfig: vi.fn(async (settingKey: string, envVar: string) => mocks.runtimeValues[settingKey] ?? mocks.runtimeValues[envVar] ?? ""),
}));

import { clampGenXMaxTokens, discoverGenXModelCatalogue, executeGenXTask, pollGenXMediaJob, resolveGenXConfig, testRawGenXConnection } from "./genxProvider";

describe("GenX key-only defaults", () => {
  beforeEach(() => {
    Object.keys(mocks.runtimeValues).forEach((key) => delete mocks.runtimeValues[key]);
  });

  it("uses the verified GenX Router route when only a key is saved", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";

    const config = await resolveGenXConfig();

    expect(config.key).toBe("saved-genx-key");
    expect(config.base).toBe("https://query.genx.sh/v1");
    expect(config.endpoint).toBe("https://query.genx.sh/v1/chat/completions");
    expect(config.model).toBe("gpt-5.4");
  });

  it("does not use the invalid old GenX turbo model by default", async () => {
    const config = await resolveGenXConfig();

    expect(config.model).not.toBe("gpt-5.4-turbo");
    expect(config.model).not.toBe("openai/gpt-4.1-mini");
  });

  it("clamps max_tokens to GenX minimum and defaults marketing generation to 512", () => {
    expect(clampGenXMaxTokens(1)).toBe(16);
    expect(clampGenXMaxTokens(15)).toBe(16);
    expect(clampGenXMaxTokens(16)).toBe(16);
    expect(clampGenXMaxTokens(undefined)).toBe(512);
  });

  it("discovers GenX catalogue and category endpoints under /api/v1/models", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "gpt-5.4" }, { id: "veo-3.1" }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "gpt-5.4" }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "flux-1" }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "veo-3.1" }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "voice-pro-1" }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "audio-pro-1" }] }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "gpt-5.4" }] }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const discovery = await discoverGenXModelCatalogue(1000);

    expect(discovery.status).toBe("success");
    expect(discovery.models.length).toBe(2);
    expect(discovery.categoryModels.video).toEqual(["veo-3.1"]);
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual(expect.arrayContaining([
      "https://query.genx.sh/api/v1/models",
      "https://query.genx.sh/api/v1/models?category=text",
      "https://query.genx.sh/api/v1/models?category=image",
      "https://query.genx.sh/api/v1/models?category=video",
      "https://query.genx.sh/api/v1/models?category=voice",
      "https://query.genx.sh/api/v1/models?category=audio",
      "https://query.genx.sh/v1/models",
    ]));
  });

  it("sends OpenAI-compatible payload with gpt-5.4 and clamped max_tokens", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await executeGenXTask("copywriting", { prompt: "test", max_tokens: 4 }, 1000);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(fetchMock.mock.calls[0][0]).toBe("https://query.genx.sh/v1/chat/completions");
    expect(body.model).toBe("gpt-5.4");
    expect(body.max_tokens).toBe(16);
    expect(body.messages[0].content).toBe("test");
  });

  it("uses the GenX media endpoint for configured video models instead of chat completions", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";
    mocks.runtimeValues.genx_video_model = "genx-video-t2v-test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ job_id: "job-123", status: "queued" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeGenXTask("text_to_video", { prompt: "Create a horse video" }, 1000);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(fetchMock.mock.calls[0][0]).toBe("https://query.genx.sh/api/v1/generate");
    expect(body.model).toBe("genx-video-t2v-test");
    expect(body.task).toBe("text_to_video");
    expect(body.prompt).toBeUndefined();
    expect(body.input).toBeUndefined();
    expect(body.parameters).toBeUndefined();
    expect(body.params).toEqual({
      prompt: "Create a horse video",
      input: "Create a horse video",
      quality: "standard",
      response_format: "url",
    });
    expect(result.resultType).toBe("provider_job_pending");
    expect(result.endpointFamily).toBe("genx_async_job");
    expect(result.output).toMatchObject({
      resultType: "job_pending",
      providerJobId: "job-123",
      providerStatus: "queued",
      source: "app_genx_media_job",
    });
  });

  it("allows the default model fallback for GenX media and sends params payload", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ job_id: "job-456", status: "queued" }), {
      status: 202,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeGenXTask("text_to_video", {
      prompt: "Create a horse video introducing EquiProfile",
      duration: 5,
      aspect_ratio: "16:9",
      platform: "marketing_studio",
    }, 1000);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("gpt-5.4");
    expect(body.params).toEqual({
      prompt: "Create a horse video introducing EquiProfile",
      input: "Create a horse video introducing EquiProfile",
      quality: "standard",
      platform: "marketing_studio",
      response_format: "url",
      duration: 5,
      aspect_ratio: "16:9",
    });
    expect(result.model).toBe("gpt-5.4");
    expect(result.resultType).toBe("provider_job_pending");
  });

  it("normalizes playable file responses into completed URL output", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";
    mocks.runtimeValues.genx_video_model = "genx-video-t2v-test";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      file: {
        url: "https://cdn.example.com/video.mp4",
        mime_type: "video/mp4",
      },
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeGenXTask("text_to_video", { prompt: "Create a horse video" }, 1000);

    expect(result.resultType).toBe("url");
    expect(result.output).toMatchObject({
      resultType: "url",
      url: "https://cdn.example.com/video.mp4",
      mimeType: "video/mp4",
    });
  });

  it("classifies text/plain media responses as video_plan needing a render model", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";
    mocks.runtimeValues.genx_video_model = "gpt-5.4";
    const fetchMock = vi.fn(async () => new Response("Shot plan only", {
      status: 200,
      headers: { "content-type": "text/plain" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeGenXTask("text_to_video", { prompt: "Create a horse video" }, 1000);

    expect(result.resultType).toBe("failed");
    expect(result.output).toMatchObject({
      resultType: "video_plan",
      status: "needs_render_model",
      mimeType: "text/plain",
    });
  });

  it("normalizes GenX /api/v1/jobs/:id result_url when polling async jobs", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "completed", result_url: "https://cdn.example.com/video.mp4" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await pollGenXMediaJob("job-xyz", "text_to_video", 1000);

    expect(result.status).toBe("resolved");
    expect(result.resultType).toBe("url");
    expect(result.url).toBe("https://cdn.example.com/video.mp4");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/jobs/job-xyz");
  });

  it("keeps chat/copywriting behavior unchanged", async () => {
    mocks.runtimeValues.genx_api_key = "saved-genx-key";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "copy" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await executeGenXTask("chat", { messages: [{ role: "user", content: "hello" }] }, 1000);

    expect(fetchMock.mock.calls[0][0]).toBe("https://query.genx.sh/v1/chat/completions");
  });

  it("still exports raw connection diagnostics", () => {
    expect(typeof testRawGenXConnection).toBe("function");
  });
});
