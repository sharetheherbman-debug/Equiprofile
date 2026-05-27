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
    delete process.env.GENX_MODEL;
    delete process.env.GENX_VIDEO_PROMPT_ONLY;
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
    process.env.GENX_MODEL = "gpt-5.4";
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("copywriting", true);
    const genx = candidates.find((candidate) => candidate.provider === "genx");

    expect(genx?.id).toBe("gpt-5.4");
    expect(genx?.endpointFamily).toBe("openai_chat");
  });

  it("routes campaign-oriented text tasks through the model registry", async () => {
    process.env.GENX_MODEL = "gpt-5.4";
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

  it("does not treat /v1 chat model list as a video renderer fallback", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("text_to_video", true);
    const genx = candidates.find((candidate) => candidate.provider === "genx");

    expect(genx?.id).not.toBe("gpt-5.4");
  });

  it("prevents configured gpt-5.4 from becoming a text_to_video model without explicit override", async () => {
    process.env.GENX_VIDEO_MODEL = "gpt-5.4";
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("text_to_video", true);

    expect(candidates.some((candidate) => candidate.provider === "genx" && candidate.id === "gpt-5.4")).toBe(false);
  });

  it("allows explicit GENX_VIDEO_PROMPT_ONLY override for prompt-only video planning", async () => {
    process.env.GENX_VIDEO_MODEL = "gpt-5.4";
    process.env.GENX_VIDEO_PROMPT_ONLY = "true";
    resetProviderModelDiscoveryCacheForTests();
    const candidates = await resolveModelCandidatesForTask("text_to_video", true);

    expect(candidates.some((candidate) => candidate.provider === "genx" && candidate.id === "gpt-5.4")).toBe(true);
  });
});
