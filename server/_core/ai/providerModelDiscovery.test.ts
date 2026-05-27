import { afterEach, describe, expect, it } from "vitest";
import {
  discoverProviderModels,
  resetProviderModelDiscoveryCacheForTests,
  resolveModelCandidatesForTask,
} from "./providerModelDiscovery";

describe("providerModelDiscovery", () => {
  afterEach(() => {
    delete process.env.GENX_VIDEO_MODEL;
    delete process.env.GENX_IMAGE_MODEL;
  });

  it("discovers at least Qwen fallback model metadata", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const snapshot = await discoverProviderModels(true);

    expect(snapshot.providers.qwen.length).toBeGreaterThan(0);
    expect(snapshot.providers.qwen[0].id).toBeTruthy();
    expect(snapshot.providers.qwen[0].categories).toContain("copywriting");
    expect(snapshot.providers.qwen[0].executableTasks).toContain("copywriting");
  });

  it("uses cached discovery when not forced", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const first = await discoverProviderModels(true);
    const second = await discoverProviderModels(false);

    expect(second.discoveredAt).toBe(first.discoveredAt);
  });

  it("exposes GenX default text model as a backward-compatible route candidate", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("copywriting", true);
    const genx = candidates.find((candidate) => candidate.provider === "genx");

    expect(genx?.id).toBe("gpt-5.4");
    expect(genx?.endpointFamily).toBe("openai_chat");
  });

  it("routes campaign-oriented text tasks through the model registry", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("campaign_generation", true);
    const genx = candidates.find((candidate) => candidate.provider === "genx");

    expect(genx?.id).toBe("gpt-5.4");
    expect(genx?.executableTasks).toContain("campaign_generation");
  });

  it("does not mark Qwen media models executable without a native media endpoint", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("text_to_video", true);

    expect(candidates.some((candidate) => candidate.provider === "qwen")).toBe(false);
  });

  it("resolves configured GenX media models before HF/Qwen for video tasks", async () => {
    process.env.GENX_VIDEO_MODEL = "genx-video-t2v-test";
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("text_to_video", true);

    expect(candidates[0].provider).toBe("genx");
    expect(candidates[0].id).toBe("genx-video-t2v-test");
    expect(candidates[0].endpointFamily).toBe("genx_async_job");
    expect(candidates[0].executableTasks).toContain("text_to_video");
  });

  it("uses the GenX generate endpoint fallback model when discovery exposes no specialist media model", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("text_to_video", true);
    const genx = candidates.find((candidate) => candidate.provider === "genx");

    expect(genx?.id).toBe("gpt-5.4");
    expect(genx?.endpointFamily).toBe("genx_async_job");
    expect(genx?.routeReason).toBe("GenX /v1/models did not expose specialist media model IDs; using GenX generate endpoint fallback model gpt-5.4.");
  });
});
