export const SOCIAL_PLATFORMS = [
  "youtube",
  "meta",
  "tiktok",
  "linkedin",
  "google_business_profile",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_CONNECTION_STATES = [
  "not_connected",
  "draft_only",
  "connected",
  "approval_required",
  "ready_to_publish",
  "error",
] as const;

export type SocialConnectionState = (typeof SOCIAL_CONNECTION_STATES)[number];

export const ONBOARDING_TYPES = [
  "horse_owner",
  "stable",
  "school",
  "teacher",
] as const;

export type OnboardingType = (typeof ONBOARDING_TYPES)[number];

export type GrowthEngineAdapter = {
  id: string;
  appName: string;
  appSlug: string;
  branding: {
    primaryColor: string;
    accentColor: string;
    logoPath: string;
    domainHint: string;
  };
  onboardingTypes: OnboardingType[];
  tenantModel: {
    defaultType: "individual" | "stable" | "school" | "academy";
    supportedTypes: string[];
  };
  planModel: {
    defaultPlan: string;
    supportedPlans: string[];
  };
  featureFlags: Record<string, boolean>;
  contentTone: {
    voice: string;
    region: string;
  };
  aiContext: {
    domain: string;
    safetyFocus: string[];
  };
  lifecycleTriggers: string[];
};

export type GrowthFunnelEvent = {
  tenantId: string;
  actorUserId?: number;
  eventType: string;
  stage: string;
  source?: string;
  metadata?: Record<string, unknown>;
};
