import { z } from "zod";

export const MARKETING_BRAND_OVERLAY_TEMPLATES = [
  "lower_third",
  "corner_logo",
  "end_card",
  "social_reel",
  "youtube_landscape",
] as const;

export type MarketingBrandOverlayTemplate = (typeof MARKETING_BRAND_OVERLAY_TEMPLATES)[number];

export const MARKETING_ASSET_VERSION_TYPES = [
  "original",
  "branded",
  "captioned",
  "voiceover_added",
  "resized",
  "campaign_export",
] as const;

export type MarketingAssetVersionType = (typeof MARKETING_ASSET_VERSION_TYPES)[number];

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

export const marketingBrandKitInputSchema = z.object({
  tenantId: z.string().min(1).max(100),
  workspaceId: z.string().min(1).max(120),
  hostAppId: z.string().min(1).max(120),
  brandName: z.string().min(1).max(200),
  domain: z.string().min(1).max(300),
  tagline: z.string().max(300).nullable().optional(),
  primaryCta: z.string().min(1).max(300),
  secondaryCta: z.string().max(300).nullable().optional(),
  toneOfVoice: z.string().min(1).max(2000),
  targetAudience: z.string().max(2000).nullable().optional(),
  primaryColor: z.string().min(4).max(30),
  secondaryColor: z.string().min(4).max(30),
  accentColor: z.string().max(30).nullable().optional(),
  logoAssetId: z.number().int().positive().nullable().optional(),
  logoUrl: z.string().max(2000).nullable().optional(),
  faviconUrl: z.string().max(2000).nullable().optional(),
  overlayTemplate: z.enum(MARKETING_BRAND_OVERLAY_TEMPLATES),
  defaultAspectRatio: z.string().min(1).max(20).default("16:9"),
  safeArea: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type MarketingBrandKitInput = z.infer<typeof marketingBrandKitInputSchema>;

export interface MarketingBrandSummary {
  id: number;
  brandName: string;
  domain: string;
  primaryCta: string;
  toneOfVoice: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  logoUrl: string | null;
  overlayTemplate: MarketingBrandOverlayTemplate;
  defaultAspectRatio: string;
}

export interface MarketingOverlayConfig {
  template: MarketingBrandOverlayTemplate;
  logo: {
    enabled: boolean;
    url: string | null;
    position: "top_left" | "top_right" | "bottom_left" | "bottom_right" | "center";
  };
  text: {
    brandNamePosition: "top_left" | "top_right" | "bottom_left" | "bottom_right" | "center";
    domainPosition: "top_left" | "top_right" | "bottom_left" | "bottom_right" | "center";
    ctaPosition: "top_left" | "top_right" | "bottom_left" | "bottom_right" | "center";
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string | null;
  };
  captionSafeZone: {
    topPct: number;
    rightPct: number;
    bottomPct: number;
    leftPct: number;
  };
  endCard: {
    enabled: boolean;
    durationSeconds: number;
  };
}
