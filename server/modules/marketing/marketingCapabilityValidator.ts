/**
 * Marketing Capability Validator
 *
 * Decides what generation is possible BEFORE any provider call is made.
 * All rules defined in MARKETING_APP_TARGET_ARCHITECTURE.md §7 are enforced here.
 */

import type { MarketingContentType, FinalDeliveryMode } from "../../../shared/_core/marketingStudioPlan";

/** Maximum raw clip duration a provider can reliably produce without scene assembly. */
export const MAX_RAW_CLIP_DURATION_SECONDS = 10;

/**
 * Minimum duration (seconds) at which we require assembly instead of a single raw clip.
 * Requests at or above this threshold must use scene-based assembly.
 */
export const ASSEMBLY_REQUIRED_THRESHOLD_SECONDS = 15;

/** Subjects that are semantically incompatible with horse/equine content. */
const FORBIDDEN_EQUINE_SUBJECTS = [
  "laptop",
  "office",
  "desk",
  "keyboard",
  "computer",
  "phone",
  "smartphone",
  "city",
  "urban",
  "skyscraper",
  "car",
  "bus",
  "factory",
];

/** Equine/stable subject keywords that identify horse-context prompts. */
const EQUINE_SUBJECT_KEYWORDS = [
  "horse",
  "horses",
  "equine",
  "stable",
  "stables",
  "pony",
  "foal",
  "mare",
  "stallion",
  "equiprofile",
  "stable owner",
  "equestrian",
  "paddock",
  "arena",
];

export interface CapabilityValidationResult {
  canDirectGenerateRawClip: boolean;
  needsAssembly: boolean;
  needsScenePlan: boolean;
  needsStockMedia: boolean;
  needsVoiceover: boolean;
  needsCaptions: boolean;
  needsBrandOverlay: boolean;
  unsupportedReason: string | null;
  maxRawClipDurationSeconds: number;
  requestedDurationSeconds: number;
  finalDeliveryMode: FinalDeliveryMode;
  /** True when horse/equine context was detected and preserved in the plan. */
  equineContextPreserved: boolean;
}

export interface CapabilityValidationInput {
  contentType: MarketingContentType;
  requestedDurationSeconds: number;
  userPrompt: string;
  /** Seconds the provider has advertised as its maximum raw clip length. Default: MAX_RAW_CLIP_DURATION_SECONDS */
  providerMaxRawClipSeconds?: number;
}

function isEquinePrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return EQUINE_SUBJECT_KEYWORDS.some((kw) => lower.includes(kw));
}

function hasForbiddenEquineSubject(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return FORBIDDEN_EQUINE_SUBJECTS.some((kw) => lower.includes(kw));
}

/**
 * Validate whether the requested marketing generation is supported
 * and decide the correct delivery mode before any provider call.
 */
export function validateMarketingCapability(
  input: CapabilityValidationInput,
): CapabilityValidationResult {
  const {
    contentType,
    requestedDurationSeconds,
    userPrompt,
    providerMaxRawClipSeconds = MAX_RAW_CLIP_DURATION_SECONDS,
  } = input;

  const equineContext = isEquinePrompt(userPrompt);
  const equineContextPreserved = equineContext;

  // Block incompatible subject matter for equine prompts
  if (equineContext && hasForbiddenEquineSubject(userPrompt)) {
    return {
      canDirectGenerateRawClip: false,
      needsAssembly: false,
      needsScenePlan: false,
      needsStockMedia: false,
      needsVoiceover: false,
      needsCaptions: false,
      needsBrandOverlay: false,
      unsupportedReason:
        "Request blocked before generation because it may produce off-brief output: the subject is incompatible with horse/equine context. Please remove non-equine subjects and try again.",
      maxRawClipDurationSeconds: providerMaxRawClipSeconds,
      requestedDurationSeconds,
      finalDeliveryMode: "export_only",
      equineContextPreserved,
    };
  }

  // --- 3-minute video: always assembled_video ---
  if (contentType === "youtube_3min_video" || requestedDurationSeconds >= 180) {
    return {
      canDirectGenerateRawClip: false,
      needsAssembly: true,
      needsScenePlan: true,
      needsStockMedia: true,
      needsVoiceover: true,
      needsCaptions: true,
      needsBrandOverlay: true,
      unsupportedReason: null,
      maxRawClipDurationSeconds: providerMaxRawClipSeconds,
      requestedDurationSeconds,
      finalDeliveryMode: "assembled_video",
      equineContextPreserved,
    };
  }

  // --- Text/copy-only content types ---
  const textOnlyTypes: MarketingContentType[] = [
    "email_campaign",
    "blog_seo_article",
    "linkedin_post",
  ];
  if (textOnlyTypes.includes(contentType)) {
    return {
      canDirectGenerateRawClip: false,
      needsAssembly: false,
      needsScenePlan: false,
      needsStockMedia: false,
      needsVoiceover: false,
      needsCaptions: false,
      needsBrandOverlay: false,
      unsupportedReason: null,
      maxRawClipDurationSeconds: providerMaxRawClipSeconds,
      requestedDurationSeconds,
      finalDeliveryMode: "text_pack",
      equineContextPreserved,
    };
  }

  // --- Campaign-pack content types ---
  const campaignPackTypes: MarketingContentType[] = [
    "weekly_content_pack",
    "launch_campaign",
    "lead_gen_campaign",
  ];
  if (campaignPackTypes.includes(contentType)) {
    return {
      canDirectGenerateRawClip: false,
      needsAssembly: false,
      needsScenePlan: false,
      needsStockMedia: false,
      needsVoiceover: false,
      needsCaptions: false,
      needsBrandOverlay: false,
      unsupportedReason: null,
      maxRawClipDurationSeconds: providerMaxRawClipSeconds,
      requestedDurationSeconds,
      finalDeliveryMode: "campaign_pack",
      equineContextPreserved,
    };
  }

  // --- Video content types ---
  // Reels / Shorts (30–60 s): assembled_video unless provider supports the full duration
  const reelTypes: MarketingContentType[] = [
    "instagram_reel",
    "tiktok_video",
    "youtube_short",
    "facebook_ad",
  ];

  if (reelTypes.includes(contentType) || requestedDurationSeconds > 0) {
    // If provider cannot handle the requested duration, require assembly
    const durationExceedsRawMax = requestedDurationSeconds > providerMaxRawClipSeconds;
    const durationRequiresAssembly = requestedDurationSeconds >= ASSEMBLY_REQUIRED_THRESHOLD_SECONDS;

    if (durationExceedsRawMax || durationRequiresAssembly) {
      return {
        canDirectGenerateRawClip: false,
        needsAssembly: true,
        needsScenePlan: true,
        needsStockMedia: true,
        needsVoiceover: false,
        needsCaptions: true,
        needsBrandOverlay: true,
        unsupportedReason: null,
        maxRawClipDurationSeconds: providerMaxRawClipSeconds,
        requestedDurationSeconds,
        finalDeliveryMode: "assembled_video",
        equineContextPreserved,
      };
    }

    // Short raw clip within provider capability
    return {
      canDirectGenerateRawClip: true,
      needsAssembly: false,
      needsScenePlan: false,
      needsStockMedia: false,
      needsVoiceover: false,
      needsCaptions: false,
      needsBrandOverlay: false,
      unsupportedReason: null,
      maxRawClipDurationSeconds: providerMaxRawClipSeconds,
      requestedDurationSeconds,
      finalDeliveryMode: "raw_clip",
      equineContextPreserved,
    };
  }

  // Fallback: text pack
  return {
    canDirectGenerateRawClip: false,
    needsAssembly: false,
    needsScenePlan: false,
    needsStockMedia: false,
    needsVoiceover: false,
    needsCaptions: false,
    needsBrandOverlay: false,
    unsupportedReason: null,
    maxRawClipDurationSeconds: providerMaxRawClipSeconds,
    requestedDurationSeconds,
    finalDeliveryMode: "text_pack",
    equineContextPreserved,
  };
}
