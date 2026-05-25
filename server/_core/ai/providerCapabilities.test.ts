import { describe, expect, it } from "vitest";
import {
  categoryForTask,
  getProviderCapabilityRegistry,
  rankProvidersForCapability,
  resolveProviderSelectionForTask,
} from "./providerCapabilities";

describe("providerCapabilities", () => {
  it("maps tasks to capability categories", () => {
    expect(categoryForTask("copywriting")).toBe("copywriting");
    expect(categoryForTask("text_to_video")).toBe("text_to_video");
  });

  it("ranks providers for copywriting with GenX first", async () => {
    const ranked = await rankProvidersForCapability("copywriting");
    expect(ranked[0]).toBe("genx");
    expect(ranked).toContain("qwen");
  });

  it("resolves provider selection with fallback order", async () => {
    const selection = await resolveProviderSelectionForTask("text_to_image");
    expect(selection.primaryProvider).toBeTruthy();
    expect(selection.fallbackProviders.length).toBeGreaterThan(0);
  });

  it("builds full provider registry with capability scores", async () => {
    const registry = await getProviderCapabilityRegistry();
    expect(registry.genx.capabilities.reasoning).toBeGreaterThan(0.5);
    expect(registry.huggingface.capabilities.image_generation).toBeGreaterThan(0.5);
  });
});
