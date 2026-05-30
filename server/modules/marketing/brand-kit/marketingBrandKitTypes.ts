export const MARKETING_OVERLAY_TEMPLATES = [
  "lower_third",
  "corner_logo",
  "end_card",
  "social_reel",
  "youtube_landscape",
] as const;

export type MarketingOverlayTemplate = typeof MARKETING_OVERLAY_TEMPLATES[number];

export interface MarketingBrandKitSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MarketingBrandKitRecord {
  id: number;
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandName: string;
  domain: string;
  tagline: string | null;
  primaryCta: string;
  secondaryCta: string | null;
  toneOfVoice: string;
  targetAudience: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  logoAssetId: number | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  overlayTemplate: MarketingOverlayTemplate;
  defaultAspectRatio: string;
  safeArea: MarketingBrandKitSafeArea | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type MarketingBrandKitUpsertInput = {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  brandName?: string;
  domain?: string;
  tagline?: string | null;
  primaryCta?: string;
  secondaryCta?: string | null;
  toneOfVoice?: string;
  targetAudience?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string | null;
  logoAssetId?: number | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  overlayTemplate?: MarketingOverlayTemplate;
  defaultAspectRatio?: string;
  safeArea?: MarketingBrandKitSafeArea | null;
  metadata?: Record<string, unknown>;
};

export interface MarketingRenderOverlayConfig {
  brandKitId: number | null;
  overlayTemplate: MarketingOverlayTemplate;
  brandName: string;
  domain: string;
  cta: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoUrl?: string;
  logoAssetId?: number;
  placements: {
    logo: "top_right" | "top_left" | "none";
    brandDomain: "top_left" | "bottom_left" | "bottom_center";
    cta: "bottom_right" | "bottom_left" | "bottom_center";
  };
  safeArea: MarketingBrandKitSafeArea;
  endCard: {
    enabled: boolean;
    title: string;
    cta: string;
    domain: string;
  };
}

export interface MarketingBrandPublicSummary {
  id: number | null;
  brandName: string;
  domain: string;
  primaryCta: string;
  toneOfVoice: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  logoUrl: string | null;
  overlayTemplate: MarketingOverlayTemplate;
}
