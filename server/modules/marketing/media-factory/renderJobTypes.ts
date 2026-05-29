import type { MarketingContentType, MarketingStudioPlan, SceneMediaKind, SceneSourceType } from "../../../../shared/_core/marketingStudioPlan";

export type RenderJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "setup_needed";

export interface RenderOutput {
  publicUrl: string;
  filePath: string;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
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
  brandName: string;
  domain: string;
  cta: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

export interface MarketingRenderJob {
  id: string;
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  planId: string | null;
  campaignId: number | null;
  campaignItemId: number | null;
  status: RenderJobStatus;
  contentType: MarketingContentType;
  originalUserPrompt: string;
  renderMode: MarketingStudioPlan["renderMode"];
  durationTargetSeconds: number;
  timeline: MarketingTimeline;
  captions: {
    mode: "narration";
    format: "srt" | "vtt";
    text: string;
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
