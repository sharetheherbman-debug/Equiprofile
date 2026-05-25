import { describe, expect, it } from "vitest";
import { orderCopywritingProviders } from "./providerRouting";

describe("orderCopywritingProviders", () => {
  it("prioritizes COPYWRITING_PROVIDER when valid and available", () => {
    const order = orderCopywritingProviders("qwen", (p) => p !== "huggingface");
    expect(order).toEqual(["qwen", "genx"]);
  });

  it("falls back to GenX first when preferred provider is unavailable", () => {
    const order = orderCopywritingProviders("huggingface", (p) => p === "genx" || p === "qwen");
    expect(order).toEqual(["genx", "qwen"]);
  });
});
