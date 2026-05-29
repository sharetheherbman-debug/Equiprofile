import { getRuntimeConfig } from "../../../dynamicConfig";
import type { MarketingStudioPlan, MarketingStudioScene, SceneMediaKind } from "../../../../shared/_core/marketingStudioPlan";

export type MarketingStockProvider = "pexels" | "pixabay";
export type MarketingStockProviderPreference = MarketingStockProvider | "auto";
export type MarketingStockStatus = "ok" | "setup_needed" | "provider_unavailable";

export interface MarketingStockMediaItem {
  provider: MarketingStockProvider;
  providerAssetId: string;
  title: string;
  previewUrl: string | null;
  assetUrl: string | null;
  mediaKind: Exclude<SceneMediaKind, "text_card">;
  sourceMetadata: Record<string, unknown>;
}

export interface MarketingStockSearchResult {
  status: MarketingStockStatus;
  provider: MarketingStockProvider | "auto";
  query: string;
  items: MarketingStockMediaItem[];
  message?: string;
}

const EQUINE_TERMS = ["horse", "equine", "stable", "equestrian", "paddock", "barn"];
const EQUINE_OFF_TOPIC_TERMS = ["laptop", "office", "city", "business", "skyline", "corporate", "meeting", "desk"];

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function inferPreferredMediaKind(scene: Pick<MarketingStudioScene, "mediaKind" | "sourceType">): "video" | "image" {
  if (scene.mediaKind === "image") return "image";
  if (scene.mediaKind === "video") return "video";
  return scene.sourceType === "stock" ? "video" : "image";
}

function buildStockQuery(input: {
  scene: Pick<MarketingStudioScene, "requiredSubject" | "visualPrompt" | "narration">;
  originalUserPrompt: string;
  audience?: string;
  industry?: string;
}): string {
  const pieces = [
    normalizeText(input.scene.requiredSubject),
    normalizeText(input.scene.visualPrompt),
    normalizeText(input.scene.narration),
    normalizeText(input.originalUserPrompt),
    normalizeText(input.industry),
    normalizeText(input.audience),
  ].filter(Boolean);
  const combined = pieces.join(" ").toLowerCase();
  const hasEquineContext = EQUINE_TERMS.some((term) => combined.includes(term));
  const query = pieces.slice(0, 3).join(" ").trim();
  if (hasEquineContext) {
    return `${query} horse stable equestrian`.trim();
  }
  return query || "marketing scene";
}

function isSafeStockItem(item: MarketingStockMediaItem, query: string): boolean {
  const joined = `${item.title} ${item.assetUrl ?? ""} ${item.previewUrl ?? ""} ${JSON.stringify(item.sourceMetadata)}`.toLowerCase();
  const equineQuery = EQUINE_TERMS.some((term) => query.toLowerCase().includes(term));
  if (!equineQuery) return Boolean(item.assetUrl);
  const hasEquineSignal = EQUINE_TERMS.some((term) => joined.includes(term));
  if (!hasEquineSignal) return false;
  const hasOffTopicSignal = EQUINE_OFF_TOPIC_TERMS.some((term) => joined.includes(term));
  return !hasOffTopicSignal && Boolean(item.assetUrl);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function detectMimeFromUrl(url: string | null): string | null {
  if (!url) return null;
  const value = url.toLowerCase();
  if (value.includes(".mp4")) return "video/mp4";
  if (value.includes(".mov")) return "video/quicktime";
  if (value.includes(".webm")) return "video/webm";
  if (value.includes(".png")) return "image/png";
  if (value.includes(".webp")) return "image/webp";
  if (value.includes(".jpg") || value.includes(".jpeg")) return "image/jpeg";
  return null;
}

async function getProviderKey(provider: MarketingStockProvider): Promise<string | null> {
  if (provider === "pexels") {
    return getRuntimeConfig("marketing_pexels_api_key", "MARKETING_PEXELS_API_KEY");
  }
  return getRuntimeConfig("marketing_pixabay_api_key", "MARKETING_PIXABAY_API_KEY");
}

function normalizePexelsPhoto(photo: any, query: string): MarketingStockMediaItem {
  return {
    provider: "pexels",
    providerAssetId: String(photo?.id ?? ""),
    title: normalizeText(photo?.alt || query),
    previewUrl: firstNonEmpty(photo?.src?.medium, photo?.src?.small),
    assetUrl: firstNonEmpty(photo?.src?.original, photo?.src?.large2x, photo?.src?.large),
    mediaKind: "image",
    sourceMetadata: {
      source: "pexels",
      license: "Pexels License",
      photographer: normalizeText(photo?.photographer),
      photographerUrl: normalizeText(photo?.photographer_url),
      sourceUrl: normalizeText(photo?.url),
      mimeType: detectMimeFromUrl(firstNonEmpty(photo?.src?.original, photo?.src?.large2x, photo?.src?.large)),
    },
  };
}

function normalizePexelsVideo(video: any, query: string): MarketingStockMediaItem {
  const files: Array<{ width?: number; link?: string }> = Array.isArray(video?.video_files) ? video.video_files : [];
  const preferred = files
    .slice()
    .sort((a: { width?: number }, b: { width?: number }) => Number(b?.width ?? 0) - Number(a?.width ?? 0))
    .find((item: { link?: string }) => normalizeText(item?.link));
  return {
    provider: "pexels",
    providerAssetId: String(video?.id ?? ""),
    title: normalizeText(video?.url || query),
    previewUrl: firstNonEmpty(video?.image),
    assetUrl: firstNonEmpty(preferred?.link),
    mediaKind: "video",
    sourceMetadata: {
      source: "pexels",
      license: "Pexels License",
      userName: normalizeText(video?.user?.name),
      userUrl: normalizeText(video?.user?.url),
      sourceUrl: normalizeText(video?.url),
      mimeType: detectMimeFromUrl(firstNonEmpty(preferred?.link)),
    },
  };
}

function normalizePixabayImage(hit: any, query: string): MarketingStockMediaItem {
  return {
    provider: "pixabay",
    providerAssetId: String(hit?.id ?? ""),
    title: normalizeText(hit?.tags || query),
    previewUrl: firstNonEmpty(hit?.previewURL, hit?.webformatURL),
    assetUrl: firstNonEmpty(hit?.largeImageURL, hit?.webformatURL),
    mediaKind: "image",
    sourceMetadata: {
      source: "pixabay",
      license: "Pixabay License",
      user: normalizeText(hit?.user),
      sourceUrl: normalizeText(hit?.pageURL),
      mimeType: detectMimeFromUrl(firstNonEmpty(hit?.largeImageURL, hit?.webformatURL)),
    },
  };
}

function normalizePixabayVideo(hit: any, query: string): MarketingStockMediaItem {
  const videos = hit?.videos ?? {};
  const videoUrl = firstNonEmpty(videos?.large?.url, videos?.medium?.url, videos?.small?.url, videos?.tiny?.url);
  return {
    provider: "pixabay",
    providerAssetId: String(hit?.id ?? ""),
    title: normalizeText(hit?.tags || query),
    previewUrl: firstNonEmpty(hit?.videos?.tiny?.thumbnail, hit?.picture_id ? `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg` : null),
    assetUrl: videoUrl,
    mediaKind: "video",
    sourceMetadata: {
      source: "pixabay",
      license: "Pixabay License",
      user: normalizeText(hit?.user),
      sourceUrl: normalizeText(hit?.pageURL),
      mimeType: detectMimeFromUrl(videoUrl),
    },
  };
}

async function searchProvider(input: {
  provider: MarketingStockProvider;
  query: string;
  perPage: number;
  preferredMediaKind: "video" | "image";
}): Promise<MarketingStockSearchResult> {
  const key = await getProviderKey(input.provider);
  if (!key) {
    return {
      status: "setup_needed",
      provider: input.provider,
      query: input.query,
      items: [],
      message: `${input.provider} API key not configured`,
    };
  }

  try {
    if (input.provider === "pexels") {
      if (input.preferredMediaKind === "video") {
        const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(input.query)}&per_page=${input.perPage}`, {
          headers: { Authorization: key },
        });
        if (response.ok) {
          const json = await response.json() as any;
          const items = Array.isArray(json?.videos) ? json.videos.map((video: any) => normalizePexelsVideo(video, input.query)) : [];
          if (items.length > 0) {
            return { status: "ok", provider: "pexels", query: input.query, items };
          }
        }
      }

      const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(input.query)}&per_page=${input.perPage}`, {
        headers: { Authorization: key },
      });
      if (!response.ok) {
        return { status: "provider_unavailable", provider: "pexels", query: input.query, items: [] };
      }
      const json = await response.json() as any;
      const items = Array.isArray(json?.photos) ? json.photos.map((photo: any) => normalizePexelsPhoto(photo, input.query)) : [];
      return { status: "ok", provider: "pexels", query: input.query, items };
    }

    if (input.preferredMediaKind === "video") {
      const response = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(input.query)}&per_page=${input.perPage}`);
      if (response.ok) {
        const json = await response.json() as any;
        const items = Array.isArray(json?.hits) ? json.hits.map((hit: any) => normalizePixabayVideo(hit, input.query)) : [];
        if (items.length > 0) {
          return { status: "ok", provider: "pixabay", query: input.query, items };
        }
      }
    }

    const response = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(input.query)}&per_page=${input.perPage}`);
    if (!response.ok) {
      return { status: "provider_unavailable", provider: "pixabay", query: input.query, items: [] };
    }
    const json = await response.json() as any;
    const items = Array.isArray(json?.hits) ? json.hits.map((hit: any) => normalizePixabayImage(hit, input.query)) : [];
    return { status: "ok", provider: "pixabay", query: input.query, items };
  } catch (error) {
    return {
      status: "provider_unavailable",
      provider: input.provider,
      query: input.query,
      items: [],
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function searchMarketingStockMediaForScene(input: {
  scene: Pick<MarketingStudioScene, "requiredSubject" | "visualPrompt" | "narration" | "mediaKind" | "sourceType">;
  originalUserPrompt: string;
  audience?: string;
  industry?: string;
  providerPreference?: MarketingStockProviderPreference;
  maxPerScene?: number;
}) {
  const query = buildStockQuery({
    scene: input.scene,
    originalUserPrompt: input.originalUserPrompt,
    audience: input.audience,
    industry: input.industry,
  });
  const preferredMediaKind = inferPreferredMediaKind(input.scene);
  const perPage = Math.max(1, Math.min(20, input.maxPerScene ?? 8));
  const providerOrder: MarketingStockProvider[] = input.providerPreference === "pexels"
    ? ["pexels"]
    : input.providerPreference === "pixabay"
      ? ["pixabay"]
      : ["pexels", "pixabay"];

  let setupNeededCount = 0;
  let providerUnavailableCount = 0;

  for (const provider of providerOrder) {
    const result = await searchProvider({
      provider,
      query,
      perPage,
      preferredMediaKind,
    });
    if (result.status === "setup_needed") {
      setupNeededCount += 1;
      continue;
    }
    if (result.status === "provider_unavailable") {
      providerUnavailableCount += 1;
      continue;
    }
    const safeItems = result.items
      .filter((item) => isSafeStockItem(item, query))
      .slice(0, perPage);
    if (safeItems.length > 0) {
      return { ...result, items: safeItems };
    }
  }

  if (setupNeededCount === providerOrder.length) {
    return { status: "setup_needed" as const, provider: input.providerPreference ?? "auto", query, items: [] };
  }
  if (providerUnavailableCount > 0) {
    return { status: "provider_unavailable" as const, provider: input.providerPreference ?? "auto", query, items: [] };
  }
  return { status: "ok" as const, provider: input.providerPreference ?? "auto", query, items: [] };
}

export function applySourcedMediaToScene(input: {
  scene: MarketingStudioScene;
  result: MarketingStockSearchResult;
  pickedAt?: Date;
}): MarketingStudioScene {
  const first = input.result.items[0];
  if (!first) {
    return {
      ...input.scene,
      sourceType: "text_card",
      mediaKind: "text_card",
      assetUrl: null,
      previewUrl: null,
      provider: null,
      providerAssetId: null,
      selectedAt: null,
      selectionReason: null,
      status: "needs_review",
    };
  }
  return {
    ...input.scene,
    sourceType: "stock",
    mediaKind: first.mediaKind,
    assetUrl: first.assetUrl,
    previewUrl: first.previewUrl,
    provider: first.provider,
    providerAssetId: first.providerAssetId,
    sourceMetadata: first.sourceMetadata,
    selectedAt: (input.pickedAt ?? new Date()).toISOString(),
    selectionReason: `Auto-selected from ${first.provider} for query: ${input.result.query}`,
    status: "asset_selected",
  };
}

export function inferSceneMediaType(mediaKind: SceneMediaKind, assetUrl: string | null): "image" | "video" {
  if (mediaKind === "video") return "video";
  if (mediaKind === "image") return "image";
  return String(assetUrl ?? "").toLowerCase().match(/\.(mp4|mov|webm|m4v)(\?|$)/) ? "video" : "image";
}

export type SceneSourcePlan = Pick<MarketingStudioPlan, "originalUserPrompt" | "scenes"> & {
  audience?: string;
};

export interface SceneSourceResultSummary {
  sceneId: string;
  status: MarketingStockStatus | "preserved" | "fallback";
  selected: boolean;
  provider: MarketingStockProvider | "auto" | null;
}

function isManuallySelectedScene(scene: MarketingStudioScene): boolean {
  if (!scene.assetUrl || scene.mediaKind === "text_card") return false;
  if (scene.status !== "ready") return false;
  const reason = String(scene.selectionReason ?? "").toLowerCase();
  return reason.includes("manual");
}

export async function sourceMarketingScenesWithStockMedia(input: {
  plan: SceneSourcePlan;
  providerPreference?: MarketingStockProviderPreference;
  maxPerScene?: number;
  search?: typeof searchMarketingStockMediaForScene;
}) {
  const search = input.search ?? searchMarketingStockMediaForScene;
  const updatedScenes: MarketingStudioScene[] = [];
  const perSceneResults: SceneSourceResultSummary[] = [];
  const warnings: string[] = [];
  let status: MarketingStockStatus = "ok";

  for (const [index, rawScene] of input.plan.scenes.entries()) {
    const scene = {
      ...rawScene,
      order: rawScene.order ?? index + 1,
      mediaKind: rawScene.mediaKind ?? (rawScene.sourceType === "text_card" ? "text_card" : "video"),
      status: rawScene.status ?? "pending",
    };

    if (scene.sourceType === "text_card" || scene.mediaKind === "text_card") {
      updatedScenes.push(scene);
      perSceneResults.push({ sceneId: scene.id, status: "preserved", selected: false, provider: null });
      continue;
    }

    if (isManuallySelectedScene(scene)) {
      updatedScenes.push(scene);
      perSceneResults.push({ sceneId: scene.id, status: "preserved", selected: true, provider: (scene.provider as MarketingStockProvider | null) ?? null });
      continue;
    }

    const result = await search({
      scene,
      originalUserPrompt: input.plan.originalUserPrompt,
      audience: input.plan.audience,
      providerPreference: input.providerPreference,
      maxPerScene: input.maxPerScene,
    });

    if (result.status === "setup_needed" && status === "ok") status = "setup_needed";
    if (result.status === "provider_unavailable") status = "provider_unavailable";

    if (result.status === "ok" && result.items.length > 0) {
      const selected = applySourcedMediaToScene({ scene: scene as MarketingStudioScene, result });
      updatedScenes.push(selected);
      perSceneResults.push({ sceneId: scene.id, status: "ok", selected: true, provider: selected.provider as MarketingStockProvider | null });
      continue;
    }

    const fallbackReason = result.status === "setup_needed"
      ? "Provider setup needed for stock media."
      : result.status === "provider_unavailable"
        ? "Stock provider unavailable; falling back to text card."
        : "No safe stock media found; falling back to text card.";
    const fallbackScene: MarketingStudioScene = {
      ...(scene as MarketingStudioScene),
      sourceType: "text_card",
      mediaKind: "text_card",
      assetId: null,
      assetUrl: null,
      previewUrl: null,
      provider: null,
      providerAssetId: null,
      selectedAt: null,
      selectionReason: fallbackReason,
      status: "needs_review",
    };
    updatedScenes.push(fallbackScene);
    perSceneResults.push({ sceneId: scene.id, status: "fallback", selected: false, provider: null });
    warnings.push(`Scene ${scene.id}: ${fallbackReason}`);
  }

  return {
    status,
    plan: {
      ...input.plan,
      scenes: updatedScenes,
    },
    perSceneResults,
    warnings,
  };
}
