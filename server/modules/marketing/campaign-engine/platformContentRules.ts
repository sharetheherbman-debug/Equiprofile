import type { CampaignDeliverableType, CampaignPlatform } from "./campaignDeliverableTypes";
import type { MarketingContentType } from "@shared/_core/marketingStudioPlan";

export interface PlatformRule {
  platform: CampaignPlatform;
  defaultType: CampaignDeliverableType;
  tone: string;
  hookStyle: string;
  recommendedAssetType: "video" | "image" | "text";
  hashtagCount: number;
  strategy: string;
  contentType?: MarketingContentType;
}

export const PLATFORM_RULES: Record<CampaignPlatform, PlatformRule> = {
  Facebook: {
    platform: "Facebook",
    defaultType: "ad",
    tone: "direct and community-focused",
    hookStyle: "problem-solution headline",
    recommendedAssetType: "video",
    hashtagCount: 4,
    strategy: "Lead with clear customer pain and immediate CTA.",
    contentType: "facebook_ad",
  },
  Instagram: {
    platform: "Instagram",
    defaultType: "short",
    tone: "aspirational and visual-first",
    hookStyle: "short emotional hook",
    recommendedAssetType: "video",
    hashtagCount: 6,
    strategy: "Use short-form visual storytelling and save/share prompts.",
    contentType: "instagram_reel",
  },
  TikTok: {
    platform: "TikTok",
    defaultType: "video",
    tone: "energetic and creator-native",
    hookStyle: "first-2-second disruption",
    recommendedAssetType: "video",
    hashtagCount: 5,
    strategy: "Deliver a punchy hook and practical transformation in under 30 seconds.",
    contentType: "tiktok_video",
  },
  LinkedIn: {
    platform: "LinkedIn",
    defaultType: "post",
    tone: "authority and professional insight",
    hookStyle: "thought-leadership opener",
    recommendedAssetType: "text",
    hashtagCount: 3,
    strategy: "Publish a clear insight with proof and professional CTA.",
  },
  YouTube: {
    platform: "YouTube",
    defaultType: "script",
    tone: "educational and story-driven",
    hookStyle: "open loop",
    recommendedAssetType: "video",
    hashtagCount: 3,
    strategy: "Provide value-dense script structure with a clear subscribe/visit CTA.",
    contentType: "youtube_short",
  },
  Email: {
    platform: "Email",
    defaultType: "email",
    tone: "personal and conversion-focused",
    hookStyle: "subject-line benefit",
    recommendedAssetType: "text",
    hashtagCount: 0,
    strategy: "Deliver one clear offer with urgency and frictionless CTA.",
  },
  "Blog / SEO": {
    platform: "Blog / SEO",
    defaultType: "blog",
    tone: "informative and search-intent aligned",
    hookStyle: "search-intent promise",
    recommendedAssetType: "text",
    hashtagCount: 0,
    strategy: "Address intent with keyword-aware structure and actionable next step.",
  },
};

export const CORE_PLATFORM_ORDER: CampaignPlatform[] = [
  "Facebook",
  "Instagram",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Email",
  "Blog / SEO",
];

export function normalizePlatform(raw: string): CampaignPlatform | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("linkedin")) return "LinkedIn";
  if (value.includes("youtube")) return "YouTube";
  if (value.includes("email") || value.includes("newsletter")) return "Email";
  if (value.includes("blog") || value.includes("seo") || value.includes("landing")) return "Blog / SEO";
  return null;
}
