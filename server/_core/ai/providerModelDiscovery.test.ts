import { describe, expect, it } from "vitest";
import {
  discoverProviderModels,
  resetProviderModelDiscoveryCacheForTests,
  resolveModelCandidatesForTask,
} from "./providerModelDiscovery";

describe("providerModelDiscovery", () => {
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
});
