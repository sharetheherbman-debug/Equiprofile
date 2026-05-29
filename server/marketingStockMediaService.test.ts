import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applySourcedMediaToScene,
  searchMarketingStockMediaForScene,
} from "./modules/marketing/media-factory/marketingStockMediaService";

const getRuntimeConfigMock = vi.fn();

vi.mock("./dynamicConfig", () => ({
  getRuntimeConfig: getRuntimeConfigMock,
}));

describe("PR44 marketing stock media service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns setup_needed when provider key is missing", async () => {
    getRuntimeConfigMock.mockResolvedValueOnce(null);
    const result = await searchMarketingStockMediaForScene({
      scene: {
        requiredSubject: "horse stable",
        visualPrompt: "horse stable sunset",
        narration: "horse routine",
        sourceType: "stock",
        mediaKind: "video",
      },
      originalUserPrompt: "Create horse stable ad",
      providerPreference: "pexels",
    });
    expect(result.status).toBe("setup_needed");
  });

  it("normalizes Pexels video result", async () => {
    getRuntimeConfigMock.mockResolvedValue("pexels-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      videos: [
        {
          id: 123,
          url: "https://www.pexels.com/video/123/",
          image: "https://example.com/preview.jpg",
          user: { name: "tester", url: "https://pexels.com/@tester" },
          video_files: [{ width: 1920, link: "https://cdn.example.com/clip.mp4" }],
        },
      ],
    }), { status: 200 })));

    const result = await searchMarketingStockMediaForScene({
      scene: {
        requiredSubject: "horse stable",
        visualPrompt: "equestrian arena",
        narration: "horse",
        sourceType: "stock",
        mediaKind: "video",
      },
      originalUserPrompt: "horse ad",
      providerPreference: "pexels",
    });

    expect(result.status).toBe("ok");
    expect(result.items[0].provider).toBe("pexels");
    expect(result.items[0].providerAssetId).toBe("123");
    expect(result.items[0].assetUrl).toContain(".mp4");
    expect(result.items[0].mediaKind).toBe("video");
  });

  it("normalizes Pixabay image result", async () => {
    getRuntimeConfigMock.mockResolvedValue("pixabay-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      hits: [
        {
          id: 321,
          tags: "horse, stable",
          previewURL: "https://pix.example.com/preview.jpg",
          largeImageURL: "https://pix.example.com/large.jpg",
          pageURL: "https://pixabay.com/photos/horse",
          user: "horse_user",
        },
      ],
    }), { status: 200 })));

    const result = await searchMarketingStockMediaForScene({
      scene: {
        requiredSubject: "horse stable",
        visualPrompt: "stable horse image",
        narration: "stable",
        sourceType: "stock",
        mediaKind: "image",
      },
      originalUserPrompt: "horse ad",
      providerPreference: "pixabay",
    });

    expect(result.status).toBe("ok");
    expect(result.items[0].provider).toBe("pixabay");
    expect(result.items[0].providerAssetId).toBe("321");
    expect(result.items[0].assetUrl).toContain(".jpg");
    expect(result.items[0].mediaKind).toBe("image");
  });

  it("equine queries include horse/stable/equestrian terms", async () => {
    getRuntimeConfigMock.mockResolvedValue("pexels-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ videos: [] }), { status: 200 })));
    const result = await searchMarketingStockMediaForScene({
      scene: {
        requiredSubject: "EquiProfile for horse owners",
        visualPrompt: "stable management scene",
        narration: "horse care",
        sourceType: "stock",
        mediaKind: "video",
      },
      originalUserPrompt: "horse stable owners ad",
      providerPreference: "pexels",
    });
    expect(result.query.toLowerCase()).toContain("horse");
    expect(result.query.toLowerCase()).toContain("stable");
    expect(result.query.toLowerCase()).toContain("equestrian");
  });

  it("applies sourced media to scene and falls back to text card if none", () => {
    const scene = {
      id: "s1",
      order: 1,
      durationSeconds: 5,
      narration: "horse scene",
      visualPrompt: "horse",
      negativePrompt: "",
      sourceType: "stock" as const,
      requiredSubject: "horse",
      assetId: null,
      assetUrl: null,
      previewUrl: null,
      provider: null,
      providerAssetId: null,
      mediaKind: "video" as const,
      sourceMetadata: null,
      selectedAt: null,
      selectionReason: null,
      status: "pending" as const,
    };

    const selected = applySourcedMediaToScene({
      scene,
      result: {
        status: "ok",
        provider: "pexels",
        query: "horse stable equestrian",
        items: [{
          provider: "pexels",
          providerAssetId: "abc",
          title: "horse",
          previewUrl: "https://example.com/p.jpg",
          assetUrl: "https://example.com/v.mp4",
          mediaKind: "video",
          sourceMetadata: { source: "pexels", license: "Pexels License" },
        }],
      },
    });
    expect(selected.assetUrl).toContain("example.com");
    expect(selected.status).toBe("asset_selected");

    const fallback = applySourcedMediaToScene({
      scene,
      result: {
        status: "ok",
        provider: "pexels",
        query: "horse stable equestrian",
        items: [],
      },
    });
    expect(fallback.sourceType).toBe("text_card");
    expect(fallback.mediaKind).toBe("text_card");
    expect(fallback.status).toBe("needs_review");
  });
});
