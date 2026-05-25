import { describe, expect, it } from "vitest";
import { inferMarketingRequest } from "./inferMarketingRequest";

describe("inferMarketingRequest", () => {
  it("infers facebook reel with 30s and audience", () => {
    const result = inferMarketingRequest("Make a 30 second Facebook reel for stable owners");
    expect(result.platform).toBe("Facebook");
    expect(result.format).toBe("reel");
    expect(result.durationSeconds).toBe(30);
    expect(result.needsVideo).toBe(true);
  });

  it("infers linkedin post", () => {
    const result = inferMarketingRequest("Write a LinkedIn post for riding schools");
    expect(result.platform).toBe("LinkedIn");
    expect(result.format).toBe("post");
    expect(result.needsSocial).toBe(true);
  });

  it("infers youtube short", () => {
    const result = inferMarketingRequest("Create a YouTube short");
    expect(result.platform).toBe("YouTube");
    expect(result.format).toBe("short");
    expect(result.needsVideo).toBe(true);
  });
});
