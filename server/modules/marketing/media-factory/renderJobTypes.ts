import type {
  MarketingAudioStatus,
  MarketingCaptionFormat,
  MarketingCaptionMode,
  MarketingCaptionStatus,
  MarketingContentType,
  MarketingStudioPlan,
  SceneMediaKind,
  SceneSourceType,
} from "../../../../shared/_core/marketingStudioPlan";

export type RenderJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "setup_needed";

export type MarketingReviewStatus =
  | "needs_review"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "blocked"
  | "exported";

export interface RenderOutput {
  publicUrl: string;
  filePath: string;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
  metadata?: {
    audioIncluded: boolean;
    captionsBurnedIn: boolean;
    captionMode: MarketingCaptionMode;
    captionFormat: MarketingCaptionFormat;
    srt: string;
    vtt: string;
    audioStatus: MarketingAudioStatus;
    captionStatus: MarketingCaptionStatus;
  };
}

export interface MarketingTimelineScene {
  id: string;
  order: number;
  durationSeconds: number;
  sourceType: SceneSourceType;
  mediaKind: SceneMediaKind;
  assetId: number | null;
  assetUrl: string | null;
  previewUrl: string | null;
  provider: string | null;
  providerAssetId: string | null;
  textCard: string;
  narration: string;
  visualPrompt: string;
  caption: string;
  metadata: {
    requiredSubject: string;
    negativePrompt: string;
    sourceMetadata: Record<string, unknown> | null;
    selectedAt: string | null;
    selectionReason: string | null;
    status: "pending" | "asset_selected" | "ready" | "needs_review" | "error";
  };
}

export interface MarketingTimeline {
  scenes: MarketingTimelineScene[];
  totalDurationSeconds: number;
  captionLines: Array<{
    startSeconds: number;
    endSeconds: number;
    text: string;
  }>;
}

export interface MarketingBrandOverlay {
  brandKitId?: number | null;
  overlayTemplate?: "lower_third" | "corner_logo" | "end_card" | "social_reel" | "youtube_landscape";
  brandName: string;
  domain: string;
  cta: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoUrl?: string;
  logoAssetId?: number;
  placements?: {
    logo: "top_right" | "top_left" | "none";
    brandDomain: "top_left" | "bottom_left" | "bottom_center";
    cta: "bottom_right" | "bottom_left" | "bottom_center";
  };
  safeArea?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  endCard?: {
    enabled: boolean;
    title: string;
    cta: string;
    domain: string;
  };
}

export interface MarketingRenderJob {
  id: string;
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandKitId: number | null;
  overlayTemplate: string;
  planId: string | null;
  campaignId: number | null;
  campaignItemId: number | null;
  status: RenderJobStatus;
  reviewStatus: MarketingReviewStatus;
  contentType: MarketingContentType;
  originalUserPrompt: string;
  renderMode: MarketingStudioPlan["renderMode"];
  durationTargetSeconds: number;
  timeline: MarketingTimeline;
  captions: {
    mode: MarketingCaptionMode;
    format: MarketingCaptionFormat;
    srt: string;
    vtt: string;
    text: string;
    status: MarketingCaptionStatus;
  };
  audio: {
    status: MarketingAudioStatus;
    voiceAssetId: number | null;
    audioUrl: string | null;
    backgroundMusicUrl: string | null;
    voiceProvider: string | null;
    voiceModel: string | null;
  };
  brandOverlay: MarketingBrandOverlay;
  outputMediaAssetId: number | null;
  outputPublicUrl: string | null;
  warnings: string[];
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
