import type { MarketingContentType } from "@shared/_core/marketingStudioPlan";
import type { MarketingBrandKitRecord } from "../brand-kit";
import type { MarketingQaScore, MarketingReviewMetadata } from "../qa-engine";

export type CampaignPlatform =
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "LinkedIn"
  | "YouTube"
  | "Email"
  | "Blog / SEO";

export type CampaignDeliverableType =
  | "post"
  | "video"
  | "image"
  | "email"
  | "blog"
  | "ad"
  | "script"
  | "short"
  | "campaign_plan";

export interface CampaignSourceRecord {
  id: number;
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  name: string;
  goal: string;
  audience: string;
  channels: string[];
  startDate: string | null;
  durationDays: number;
}

export interface MarketingCampaignBrief {
  campaignId: number;
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandKitId: number | null;
  campaignName: string;
  goal: string;
  audience: string;
  offer: string;
  primaryCta: string;
  channels: CampaignPlatform[];
  startDate: string;
  durationDays: number;
  toneOfVoice: string;
  brandContext: {
    brandName: string;
    domain: string;
    primaryColor: string;
    secondaryColor: string;
    overlayTemplate?: string;
    logoUrl?: string | null;
  };
  platformStrategy: Record<CampaignPlatform, string>;
  contentPillars: string[];
  successMetrics: string[];
  constraints: string[];
  generatedAt: string;
}

export interface CampaignDeliverable {
  day: number;
  dayLabel: string;
  scheduledFor: string;
  platform: CampaignPlatform;
  type: CampaignDeliverableType;
  title: string;
  body: string;
  hook: string;
  cta: string;
  hashtags: string[];
  recommendedAssetType: "video" | "image" | "text";
  visualPrompt: string;
  status: "draft" | "export_only";
  reviewStatus?: "needs_review" | "approved" | "rejected" | "changes_requested" | "blocked" | "exported";
  exported?: boolean;
  metadata: {
    platformRule: string;
    qualityChecks: string[];
    reviewChecklist?: string[];
    reviewChecklistSummary?: {
      generatedAt: string;
      total: number;
      passed: number;
      failed: number;
      blockingFailures: number;
    } | null;
    reviewQaScore?: MarketingQaScore | null;
    reviewReason?: string | null;
    manualOverride?: MarketingReviewMetadata["manualOverride"] | null;
    contentType?: MarketingContentType;
    videoPlan?: {
      status: "studio_plan_required";
      capability: "assembled_video";
      suggestedRuntimeSeconds: number;
      planInput: {
        contentType: MarketingContentType;
        platform: string;
        goal: string;
        audience: string;
        brief: string;
        script: string;
      };
      scenePlanSummary: string[];
    };
  };
}

export interface CampaignExportPack {
  campaignBrief: MarketingCampaignBrief;
  brandSummary: MarketingCampaignBrief["brandContext"];
  groupedPlatformDeliverables: Record<string, CampaignDeliverable[]>;
  dayByDayCalendar: Array<{
    day: number;
    date: string;
    items: CampaignDeliverable[];
  }>;
  copyBlocks: Array<{ platform: CampaignPlatform; title: string; body: string; cta: string }>;
  hashtags: string[];
  emailCopy: Array<{ subject: string; body: string; cta: string }>;
  blogSeoCopy: Array<{ title: string; outline: string[]; metaDescription: string }>;
  videoScripts: Array<{ platform: CampaignPlatform; title: string; script: string; scenePlanSummary?: string[] }>;
  linkedAssets: Array<{
    id: number;
    campaignItemId: number | null;
    mediaAssetId: number;
    url: string | null;
    metadata: Record<string, unknown>;
  }>;
  manualPostingChecklist: string[];
  qaChecklist: string[];
  reviewSummary: Array<{
    campaignItemId?: number | null;
    platform: CampaignPlatform;
    title: string;
    reviewStatus: string;
    exported: boolean;
    qaScore?: MarketingQaScore | null;
    checklistSummary?: CampaignDeliverable["metadata"]["reviewChecklistSummary"];
    manualOverride?: MarketingReviewMetadata["manualOverride"] | null;
    checklist: string[];
    reason?: string | null;
  }>;
  generatedAt: string;
  markdown: string;
}

export interface CampaignEngineInput {
  campaign: CampaignSourceRecord;
  brandKit: MarketingBrandKitRecord;
}
