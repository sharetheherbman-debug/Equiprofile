import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runtimeValues: {} as Record<string, string>,
}));

vi.mock("../../../dynamicConfig", () => ({
  getRuntimeConfig: vi.fn(async (settingKey: string, envVar: string) => mocks.runtimeValues[settingKey] ?? mocks.runtimeValues[envVar] ?? ""),
}));

import { resolveGenXConfig } from "./genxProvider";

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
    expect(config.model).toBe("gpt-5.4-turbo");
  });
});
