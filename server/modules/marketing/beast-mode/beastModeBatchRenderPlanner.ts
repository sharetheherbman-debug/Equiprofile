import { nanoid } from "nanoid";
import type { MarketingContentType, MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";
import type { BeastModeBrief, BeastModeVariantDraft, BeastModeVariantRecord } from "./beastModeTypes";

function contentTypeToStudioType(type: BeastModeVariantDraft["contentType"]): MarketingContentType | null {
  switch (type) {
    case "facebook_ad": return "facebook_ad";
    case "instagram_reel": return "instagram_reel";
    case "tiktok_script": return "tiktok_video";
    case "linkedin_post": return null;
    case "youtube_short": return "youtube_short";
    case "youtube_3min_outline": return "youtube_3min_video";
    case "email_sequence": return null;
    case "blog_seo_outline": return null;
  }
}

function runtimeFor(type: BeastModeVariantDraft["contentType"]) {
  return type === "youtube_3min_outline" ? 180 : 30;
}

function requiredAssetsFor(input: { brief: BeastModeBrief; variant: Pick<BeastModeVariantDraft, "platform" | "contentType">; }) {
  return [
    `${input.brief.brandSummary.brandName} brand-safe visuals`,
    `${input.variant.platform} ${input.variant.contentType} supporting footage`,
  ];
}

export function buildBeastModeStudioPlan(input: { brief: BeastModeBrief; variant: Pick<BeastModeVariantDraft, "platform" | "contentType" | "body" | "hook" | "visualPrompt">; }): MarketingStudioPlan | null {
  const contentType = contentTypeToStudioType(input.variant.contentType);
  if (!contentType) return null;
  const durationTargetSeconds = runtimeFor(input.variant.contentType);
  return {
    id: nanoid(),
    workspaceId: input.brief.workspaceId,
    hostAppId: input.brief.hostAppId,
    contentType,
    originalUserPrompt: `${input.variant.platform} ${input.variant.contentType} for ${input.brief.campaignName}`,
    goal: input.brief.goal,
    audience: input.brief.audience,
    platform: input.variant.platform,
    durationTargetSeconds,
    outputFormat: "Assembled video plan",
    brief: `${input.variant.hook} ${input.variant.body}`,
    script: `${input.variant.hook} ${input.variant.body}`,
    scenes: [
      {
        id: nanoid(),
        order: 1,
        durationSeconds: Math.max(5, Math.round(durationTargetSeconds / 3)),
        narration: input.variant.hook,
        visualPrompt: input.variant.visualPrompt,
        negativePrompt: "office laptop gibberish raw provider prompt",
        sourceType: "stock",
        requiredSubject: input.brief.brandSummary.brandName,
        assetId: null,
        assetUrl: null,
        previewUrl: null,
        provider: null,
        providerAssetId: null,
        mediaKind: "video",
        sourceMetadata: { beastMode: true },
        selectedAt: null,
        selectionReason: null,
        status: "pending",
      },
      {
        id: nanoid(),
        order: 2,
        durationSeconds: Math.max(5, Math.round(durationTargetSeconds / 3)),
        narration: input.variant.body,
        visualPrompt: input.variant.visualPrompt,
        negativePrompt: "office laptop gibberish raw provider prompt",
        sourceType: "stock",
        requiredSubject: input.brief.audience,
        assetId: null,
        assetUrl: null,
        previewUrl: null,
        provider: null,
        providerAssetId: null,
        mediaKind: "video",
        sourceMetadata: { beastMode: true },
        selectedAt: null,
        selectionReason: null,
        status: "pending",
      },
      {
        id: nanoid(),
        order: 3,
        durationSeconds: Math.max(5, durationTargetSeconds - 2 * Math.max(5, Math.round(durationTargetSeconds / 3))),
        narration: input.brief.primaryCta,
        visualPrompt: `${input.variant.visualPrompt}, CTA end card`,
        negativePrompt: "office laptop gibberish raw provider prompt",
        sourceType: "text_card",
        requiredSubject: input.brief.primaryCta,
        assetId: null,
        assetUrl: null,
        previewUrl: null,
        provider: null,
        providerAssetId: null,
        mediaKind: "text_card",
        sourceMetadata: { beastMode: true },
        selectedAt: null,
        selectionReason: null,
        status: "pending",
      },
    ],
    requiredAssets: requiredAssetsFor(input),
    voiceoverRequired: true,
    voiceoverScript: `${input.variant.hook} ${input.variant.body}`,
    voiceId: null,
    voiceProvider: null,
    voiceAssetId: null,
    audioAssetUrl: null,
    backgroundMusicUrl: null,
    captionsRequired: true,
    captionMode: "script",
    captionFormat: "srt",
    audioStatus: "pending",
    captionStatus: "pending",
    brandOverlayRequired: true,
    renderMode: "assembled_video",
    status: "scene_plan",
  };
}

export function planBeastModeBatchRenders(input: {
  variants: Array<Pick<BeastModeVariantRecord, "id" | "contentType" | "platform" | "studioPlan" | "renderJobId" | "reviewStatus" | "metadata">>;
  maxRenderJobs?: number;
  requested?: boolean;
}) {
  const maxRenderJobs = Math.max(1, input.maxRenderJobs ?? 5);
  const eligible = input.variants.filter((variant) => Boolean(variant.studioPlan) && !variant.renderJobId);
  return {
    requested: Boolean(input.requested),
    maxRenderJobs,
    queuedCount: Math.min(maxRenderJobs, eligible.length),
    eligibleVariantIds: eligible.slice(0, maxRenderJobs).map((variant) => variant.id),
    skippedVariantIds: eligible.slice(maxRenderJobs).map((variant) => variant.id),
  };
}
