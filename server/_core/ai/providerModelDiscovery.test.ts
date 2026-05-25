import { describe, expect, it } from "vitest";
import { discoverProviderModels, resetProviderModelDiscoveryCacheForTests } from "./providerModelDiscovery";

describe("providerModelDiscovery", () => {
  it("discovers at least Qwen fallback model metadata", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const snapshot = await discoverProviderModels(true);

    expect(snapshot.providers.qwen.length).toBeGreaterThan(0);
    expect(snapshot.providers.qwen[0].id).toBeTruthy();
    expect(snapshot.providers.qwen[0].categories).toContain("copywriting");
  });

  it("uses cached discovery when not forced", async () => {
    resetProviderModelDiscoveryCacheForTests();
    const first = await discoverProviderModels(true);
    const second = await discoverProviderModels(false);

    expect(second.discoveredAt).toBe(first.discoveredAt);
  });
});
