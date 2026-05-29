/**
 * Shared Marketing Studio Plan types.
 * Used by both frontend (workbench state) and backend (capability validator / render jobs).
 * Do NOT import server-only or client-only modules here.
 */

export type MarketingContentType =
  | "facebook_ad"
  | "instagram_reel"
  | "tiktok_video"
  | "linkedin_post"
  | "youtube_short"
  | "youtube_3min_video"
  | "email_campaign"
  | "blog_seo_article"
  | "weekly_content_pack"
  | "launch_campaign"
  | "lead_gen_campaign";

export type FinalDeliveryMode =
  | "raw_clip"
  | "assembled_video"
  | "text_pack"
  | "campaign_pack"
  | "export_only";

export type SceneSourceType = "stock" | "generated" | "upload" | "text_card";

export type SceneStatus = "pending" | "asset_selected" | "ready" | "error";

export type StudioPlanStatus =
  | "brief"
  | "script"
  | "scene_plan"
  | "media_selection"
  | "voice_audio"
  | "captions"
  | "brand_overlay"
  | "render"
  | "review"
  | "export"
  | "done";

export interface MarketingStudioScene {
  id: string;
  order: number;
  durationSeconds: number;
  narration: string;
  visualPrompt: string;
  negativePrompt: string;
  sourceType: SceneSourceType;
  requiredSubject: string;
  assetId: number | null;
  status: SceneStatus;
}

export interface MarketingStudioPlan {
  id: string;
  workspaceId: string;
  hostAppId: string;
  contentType: MarketingContentType;
  originalUserPrompt: string;
  goal: string;
  audience: string;
  platform: string;
  durationTargetSeconds: number;
  outputFormat: string;
  brief: string;
  script: string;
  scenes: MarketingStudioScene[];
  requiredAssets: string[];
  voiceoverRequired: boolean;
  captionsRequired: boolean;
  brandOverlayRequired: boolean;
  renderMode: FinalDeliveryMode;
  status: StudioPlanStatus;
}
