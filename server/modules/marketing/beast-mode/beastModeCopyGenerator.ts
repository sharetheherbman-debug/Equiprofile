import type { CampaignPlatform } from "../campaign-engine";
import type { BeastModeBrief, BeastModeLanguage, BeastModeVariantContentType } from "./beastModeTypes";

const LANGUAGE_PREFIX: Record<BeastModeLanguage, string> = {
  English: "",
  Afrikaans: "Afrikaans",
  Zulu: "Zulu",
  French: "Français",
  Spanish: "Español",
  German: "Deutsch",
  Portuguese: "Português",
};

function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function hashtags(platform: CampaignPlatform, brief: BeastModeBrief, angle: string) {
  return Array.from(new Set([
    `#${slug(brief.brandSummary.brandName)}`,
    `#${slug(platform)}`,
    `#${slug(angle)}`,
    `#${slug(brief.goal.split(" ").slice(0, 3).join(" "))}`,
  ])).slice(0, 4);
}

function angleLibrary(platform: CampaignPlatform, goal: string, audience: string): string[] {
  return [
    `${goal} with faster follow-through`,
    `${audience} trust and proof`,
    `urgent CTA momentum`,
    `clear before-and-after outcome`,
  ].map((item) => `${platform}: ${item}`);
}

function contentTypeLabel(contentType: BeastModeVariantContentType) {
  switch (contentType) {
    case "facebook_ad": return "Facebook ad variant";
    case "instagram_reel": return "Instagram Reel concept";
    case "tiktok_script": return "TikTok script";
    case "linkedin_post": return "LinkedIn authority post";
    case "youtube_short": return "YouTube Short script";
    case "youtube_3min_outline": return "YouTube 3-minute outline";
    case "email_sequence": return "Email sequence";
    default: return "Blog / SEO outline";
  }
}

export function generateBeastModeCopy(input: {
  brief: BeastModeBrief;
  platform: CampaignPlatform;
  contentType: BeastModeVariantContentType;
  language: BeastModeLanguage;
  variantIndex: number;
}) {
  const angle = angleLibrary(input.platform, input.brief.goal, input.brief.audience)[input.variantIndex % 4] ?? `${input.platform}: conversion angle`;
  const prefix = LANGUAGE_PREFIX[input.language];
  const languageLabel = prefix ? `${prefix} • ` : "";
  const hook = `${languageLabel}${input.brief.brandSummary.brandName} helps ${input.brief.audience} unlock ${input.brief.goal}.`;
  const body = `${contentTypeLabel(input.contentType)} for ${input.brief.campaignName}. Angle: ${angle}. Offer: ${input.brief.offer}. Show how ${input.brief.brandSummary.brandName} turns interest into action for ${input.brief.audience}, then direct people to ${input.brief.brandSummary.domain}.`;
  const cta = input.brief.primaryCta;
  const visualPrompt = `${input.platform} creative for ${input.brief.brandSummary.brandName}, ${angle}, ${input.brief.brandSummary.toneOfVoice}, brand-safe CTA frame`;
  return {
    angle,
    hook,
    body,
    cta,
    hashtags: hashtags(input.platform, input.brief, angle),
    visualPrompt,
  };
}
