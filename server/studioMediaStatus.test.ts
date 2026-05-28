import { describe, expect, it } from "vitest";
import { hasPlayablePublicAsset, mergeStudioMediaState } from "../client/src/components/marketing/studio/mediaStatus";

describe("studio media status truth", () => {
  it("publicUrl + video/mp4 wins over stale failed lifecycle", () => {
    const next = mergeStudioMediaState(
      { status: "completed", publicUrl: "https://cdn.example.com/video.mp4", mimeType: "video/mp4" },
      { status: "failed", message: "stale lifecycle failed" },
    );
    expect(next.status).toBe("completed");
  });

  it("delayed completion marks preview state as completed", () => {
    const next = mergeStudioMediaState(
      { status: "processing" },
      { status: "processing", publicUrl: "https://cdn.example.com/video.mp4", mimeType: "video/mp4" },
    );
    expect(next.status).toBe("completed");
    expect(next.progressPercent).toBe(100);
  });

  it("recognizes playable assets for library completion display", () => {
    expect(hasPlayablePublicAsset({ publicUrl: "https://cdn.example.com/video.mp4", mimeType: "video/mp4" })).toBe(true);
  });

  it("does not show failed state once playable media exists", () => {
    const completed = mergeStudioMediaState(
      { status: "completed", publicUrl: "https://cdn.example.com/video.mp4", mimeType: "video/mp4" },
      { status: "failed" },
    );
    expect(completed.status).toBe("completed");
  });
});
