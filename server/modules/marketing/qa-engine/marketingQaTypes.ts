export const MARKETING_REVIEW_STATUSES = [
  "needs_review",
  "approved",
  "rejected",
  "changes_requested",
  "blocked",
  "exported",
] as const;

export type MarketingReviewStatus = (typeof MARKETING_REVIEW_STATUSES)[number];

export const MARKETING_REVIEW_TARGET_TYPES = [
  "campaign_item",
  "media_asset",
  "render_job",
  "schedule_draft",
  "export_pack",
  "beast_mode_variant",
  "beast_mode_pack",
] as const;

export type MarketingReviewTargetType = (typeof MARKETING_REVIEW_TARGET_TYPES)[number];

export type MarketingQaChecklistItem = {
  key: string;
  label: string;
  passed: boolean;
  severity: "error" | "warning";
  reason?: string;
};

export type MarketingQaChecklist = {
  generatedAt: string;
  targetType: MarketingReviewTargetType;
  targetId: string;
  items: MarketingQaChecklistItem[];
};

export type MarketingQaScore = {
  passed: number;
  failed: number;
  score: number;
  blockingFailureCount: number;
  pass: boolean;
};

export type MarketingReviewMetadata = {
  manualOverride?: {
    used: boolean;
    action: "approve" | "export";
    reason: string;
    latestStatus?: MarketingReviewStatus | null;
    latestQaPass?: boolean | null;
  };
};

export type MarketingReviewRecord = {
  id: number;
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  targetType: MarketingReviewTargetType;
  targetId: string;
  status: MarketingReviewStatus;
  reviewerUserId: number | null;
  reason: string | null;
  checklist: MarketingQaChecklist | null;
  qaScore: MarketingQaScore | null;
  metadata: MarketingReviewMetadata | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};
