/**
 * Social Publisher Types — PR50
 *
 * Defines the adapter interface shape for future real OAuth connectors.
 * All providers default to canPublish: false / setup_needed until a real
 * posting adapter is registered in PR51/PR52.
 */

export type SocialPublisherPlatform =
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "LinkedIn"
  | "YouTube"
  | "Email"
  | "Blog / SEO";

export type SocialPublisherReadinessStatus =
  | "not_connected"
  | "export_only"
  | "setup_needed"
  | "ready_for_approval_posting";

export interface SocialPublishPayload {
  draftId: number;
  platform: SocialPublisherPlatform;
  title: string;
  content: string;
  hook?: string;
  cta?: string;
  hashtags?: string[];
  scheduledFor: string;
  assetUrls?: string[];
  videoUrl?: string | null;
  imageUrls?: string[];
  captionFileUrl?: string | null;
  reviewStatus: string;
  qaChecklistSummary?: string | null;
}

export interface SocialPublisherValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SocialPublishResult {
  success: boolean;
  platformPostId?: string;
  reason?: string;
}

/**
 * Adapter interface every social publisher must implement.
 * For PR50 all providers return canPublish: false.
 * Real implementations are added in PR51/PR52.
 */
export interface SocialPublisherAdapter {
  platform: SocialPublisherPlatform;
  canPublish: boolean;
  readinessStatus: SocialPublisherReadinessStatus;
  requiredScopes: string[];
  reason: string;
  validatePayload(payload: SocialPublishPayload): SocialPublisherValidationResult;
  publishApprovedDraft(payload: SocialPublishPayload): Promise<SocialPublishResult>;
}
