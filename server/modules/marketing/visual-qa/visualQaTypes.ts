export const VISUAL_QA_STATUSES = [
  "pending",
  "needs_review",
  "passed",
  "failed",
  "blocked",
  "setup_needed",
] as const;

export type VisualQaStatus = (typeof VISUAL_QA_STATUSES)[number];

export const VISUAL_QA_TARGET_TYPES = [
  "scene",
  "media_asset",
  "render_job",
  "campaign_item",
  "beast_mode_variant",
] as const;

export type VisualQaTargetType = (typeof VISUAL_QA_TARGET_TYPES)[number];

export interface VisualQaIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface VisualQaScore {
  relevanceScore: number;
  pass: boolean;
  blockingIssueCount: number;
  warningCount: number;
}

export interface VisualQaRecord {
  id: number;
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  targetType: VisualQaTargetType;
  targetId: string;
  status: VisualQaStatus;
  expectedSubject: string | null;
  expectedBrand: string | null;
  expectedAudience: string | null;
  frameUrls: string[];
  thumbnailUrl: string | null;
  detectedLabels: string[];
  issues: VisualQaIssue[];
  score: VisualQaScore | null;
  reviewerUserId: number | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export interface RunVisualQaInput {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  targetType: VisualQaTargetType;
  targetId: string;
  expectedSubject?: string | null;
  expectedBrand?: string | null;
  expectedAudience?: string | null;
  localVideoPath?: string | null;
  publicVideoUrl?: string | null;
  sourceMetadata?: Record<string, unknown>;
}

/** Returns true for target types that require visual QA before approval */
export function isVideoTarget(targetType: VisualQaTargetType): boolean {
  return targetType === "render_job" || targetType === "beast_mode_variant" || targetType === "campaign_item";
}
