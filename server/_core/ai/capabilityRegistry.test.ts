import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEffectiveTaskRoutingDiagnostics, getProviderCapabilityRegistryRows } from "./capabilityRegistry";
import { resetProviderModelDiscoveryCacheForTests } from "./modelRegistry";

describe("capabilityRegistry", () => {
  beforeEach(() => {
    process.env.GENX_VIDEO_MODEL = "genx-video-t2v-test";
    process.env.GENX_IMAGE_MODEL = "gpt-image-2";
    resetProviderModelDiscoveryCacheForTests();
  });

  afterEach(() => {
    delete process.env.GENX_VIDEO_MODEL;
    delete process.env.GENX_IMAGE_MODEL;
    delete process.env.GENX_VIDEO_PROMPT_ONLY;
    resetProviderModelDiscoveryCacheForTests();
  });

  it("normalizes provider registry rows with capability flags and setup_needed semantics", async () => {
    const rows = await getProviderCapabilityRegistryRows();
    const genxVideo = rows.find((row) => row.provider === "genx" && row.task === "text_to_video" && row.modelId === "genx-video-t2v-test");
    const qwenVideo = rows.find((row) => row.provider === "qwen" && row.task === "text_to_video");

    expect(genxVideo).toMatchObject({
      status: "ready",
      supportsPlayableMedia: true,
      supportsImageToVideo: false,
      endpointFamily: "genx_async_job",
    });
    expect(qwenVideo?.status).toBe("setup_needed");
    expect(qwenVideo?.lastError).toMatch(/setup_needed/i);
  });

  it("exposes effective task routing diagnostics with fallback candidates", async () => {
    const diagnostics = await getEffectiveTaskRoutingDiagnostics();
    const textToVideo = diagnostics.find((row) => row.task === "text_to_video");

    expect(textToVideo?.primary).toMatchObject({
      provider: "genx",
      modelId: "genx-video-t2v-test",
      endpointFamily: "genx_async_job",
      pollingEndpoint: "/api/v1/jobs/:id",
    });
    expect((textToVideo?.fallback ?? []).length).toBeGreaterThan(0);
  });
});
