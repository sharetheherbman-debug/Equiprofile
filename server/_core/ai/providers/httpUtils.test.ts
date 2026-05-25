import { describe, expect, it } from "vitest";
import { buildEndpoint, normalizeBaseUrl } from "./httpUtils";

describe("httpUtils", () => {
  it("normalizes base URLs without duplicating /v1", () => {
    expect(normalizeBaseUrl("https://api.genx.ai/v1", "/v1")).toBe("https://api.genx.ai/v1");
    expect(normalizeBaseUrl("https://api.genx.ai/", "/v1")).toBe("https://api.genx.ai/v1");
    expect(normalizeBaseUrl("https://api.genx.ai/v1/", "/v1")).toBe("https://api.genx.ai/v1");
  });

  it("builds endpoint paths safely", () => {
    expect(buildEndpoint("https://api.genx.ai/v1/", "/chat/completions")).toBe(
      "https://api.genx.ai/v1/chat/completions",
    );
    expect(buildEndpoint("https://api.genx.ai/v1", "chat/completions")).toBe(
      "https://api.genx.ai/v1/chat/completions",
    );
  });
});
