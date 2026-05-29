import React from "react";
import type { MarketingContentType, FinalDeliveryMode } from "@shared/_core/marketingStudioPlan";

export interface ContentTypeDefinition {
  id: MarketingContentType;
  label: string;
  platform: string;
  description: string;
  recommendedDurationSeconds: number | null;
  expectedOutput: string;
  mediaRequired: boolean;
  copyRequired: boolean;
  needsAssembly: boolean;
  voiceoverOptional: boolean;
  voiceoverRequired: boolean;
  directRawGenerationAllowed: boolean;
  deliveryMode: FinalDeliveryMode;
}

export const CONTENT_TYPE_DEFINITIONS: ContentTypeDefinition[] = [
  {
    id: "facebook_ad",
    label: "Facebook Ad",
    platform: "Facebook",
    description: "Short video or image ad optimised for Facebook feed placement.",
    recommendedDurationSeconds: 30,
    expectedOutput: "15–30 s video or static image with caption and CTA",
    mediaRequired: true,
    copyRequired: true,
    needsAssembly: true,
    voiceoverOptional: true,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "assembled_video",
  },
  {
    id: "instagram_reel",
    label: "Instagram Reel",
    platform: "Instagram",
    description: "Vertical short-form video for Instagram Reels.",
    recommendedDurationSeconds: 30,
    expectedOutput: "15–60 s vertical video with captions",
    mediaRequired: true,
    copyRequired: true,
    needsAssembly: true,
    voiceoverOptional: true,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "assembled_video",
  },
  {
    id: "tiktok_video",
    label: "TikTok Video",
    platform: "TikTok",
    description: "Short vertical video for TikTok feed.",
    recommendedDurationSeconds: 30,
    expectedOutput: "15–60 s vertical video with captions",
    mediaRequired: true,
    copyRequired: true,
    needsAssembly: true,
    voiceoverOptional: true,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "assembled_video",
  },
  {
    id: "linkedin_post",
    label: "LinkedIn Post",
    platform: "LinkedIn",
    description: "Professional image or short video post for LinkedIn.",
    recommendedDurationSeconds: null,
    expectedOutput: "Image or short clip with professional caption",
    mediaRequired: false,
    copyRequired: true,
    needsAssembly: false,
    voiceoverOptional: false,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "text_pack",
  },
  {
    id: "youtube_short",
    label: "YouTube Short",
    platform: "YouTube",
    description: "Vertical 30–60 second video for YouTube Shorts.",
    recommendedDurationSeconds: 45,
    expectedOutput: "30–60 s vertical video with captions",
    mediaRequired: true,
    copyRequired: true,
    needsAssembly: true,
    voiceoverOptional: true,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "assembled_video",
  },
  {
    id: "youtube_3min_video",
    label: "YouTube 3-minute Video",
    platform: "YouTube",
    description: "Structured product or explainer video up to 3 minutes.",
    recommendedDurationSeconds: 180,
    expectedOutput: "~3 min landscape video: script + scenes + visuals + captions + brand overlay",
    mediaRequired: true,
    copyRequired: true,
    needsAssembly: true,
    voiceoverOptional: false,
    voiceoverRequired: true,
    directRawGenerationAllowed: false,
    deliveryMode: "assembled_video",
  },
  {
    id: "email_campaign",
    label: "Email Campaign",
    platform: "Email",
    description: "Structured email campaign with subject, body, and CTA.",
    recommendedDurationSeconds: null,
    expectedOutput: "Email HTML + plain-text with subject line and CTA",
    mediaRequired: false,
    copyRequired: true,
    needsAssembly: false,
    voiceoverOptional: false,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "text_pack",
  },
  {
    id: "blog_seo_article",
    label: "Blog / SEO Article",
    platform: "Web",
    description: "Long-form SEO-optimised article with headings and meta description.",
    recommendedDurationSeconds: null,
    expectedOutput: "1000–2000 word article with H1/H2 structure and meta description",
    mediaRequired: false,
    copyRequired: true,
    needsAssembly: false,
    voiceoverOptional: false,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "text_pack",
  },
  {
    id: "weekly_content_pack",
    label: "Weekly Content Pack",
    platform: "Multi-channel",
    description: "7-day structured content plan with assets for each day.",
    recommendedDurationSeconds: null,
    expectedOutput: "7-day plan: posts, captions, image prompts, and asset schedule",
    mediaRequired: false,
    copyRequired: true,
    needsAssembly: false,
    voiceoverOptional: false,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "campaign_pack",
  },
  {
    id: "launch_campaign",
    label: "Launch Campaign",
    platform: "Multi-channel",
    description: "Full campaign plan for a product or feature launch.",
    recommendedDurationSeconds: null,
    expectedOutput: "Campaign brief + 7-day content plan + asset list",
    mediaRequired: false,
    copyRequired: true,
    needsAssembly: false,
    voiceoverOptional: false,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "campaign_pack",
  },
  {
    id: "lead_gen_campaign",
    label: "Lead-generation Campaign",
    platform: "Multi-channel",
    description: "Campaign focused on capturing leads through ads and landing pages.",
    recommendedDurationSeconds: null,
    expectedOutput: "Campaign brief + ad copy + landing page copy + lead magnet content",
    mediaRequired: false,
    copyRequired: true,
    needsAssembly: false,
    voiceoverOptional: false,
    voiceoverRequired: false,
    directRawGenerationAllowed: false,
    deliveryMode: "campaign_pack",
  },
];

export function getContentTypeById(id: MarketingContentType): ContentTypeDefinition | undefined {
  return CONTENT_TYPE_DEFINITIONS.find((type) => type.id === id);
}

const PLATFORM_EMOJI: Record<string, string> = {
  Facebook: "📘",
  Instagram: "📷",
  TikTok: "🎵",
  LinkedIn: "💼",
  YouTube: "▶️",
  Email: "📧",
  Web: "🌐",
  "Multi-channel": "📦",
};

export function CreateTypeSelector({
  onSelect,
}: {
  onSelect: (type: ContentTypeDefinition) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">Choose the type of content you want to create, then complete the guided studio workflow.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="create-type-selector">
        {CONTENT_TYPE_DEFINITIONS.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(type)}
            className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-stone-300 hover:bg-stone-50 transition-colors"
            data-content-type={type.id}
          >
            <span className="text-lg">{PLATFORM_EMOJI[type.platform] ?? "🎯"}</span>
            <span className="font-medium text-stone-800 text-sm">{type.label}</span>
            <span className="text-xs text-stone-500 leading-snug">{type.description}</span>
            {type.recommendedDurationSeconds ? (
              <span className="mt-1 text-xs text-stone-400">~{type.recommendedDurationSeconds}s</span>
            ) : null}
            {type.needsAssembly ? (
              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                Assembly required
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
