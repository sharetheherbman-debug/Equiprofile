import type { CampaignDeliverable, CampaignDeliverableType, CampaignPlatform, MarketingCampaignBrief } from "./campaignDeliverableTypes";
import { PLATFORM_RULES } from "./platformContentRules";

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "");
}

function buildHashtags(platform: CampaignPlatform, brief: MarketingCampaignBrief, limit: number): string[] {
  if (!limit) return [];
  const brand = `#${slug(brief.brandContext.brandName || "brand")}`;
  const audience = `#${slug(brief.audience.split(" ").slice(0, 3).join(" ") || "audience")}`;
  const goal = `#${slug(brief.goal.split(" ").slice(0, 3).join(" ") || "growth")}`;
  const platformTag = `#${slug(platform)}`;
  return Array.from(new Set([brand, audience, goal, platformTag])).slice(0, limit);
}

function buildDayDate(startDate: string, day: number): string {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + (day - 1));
  return `${start.toISOString().slice(0, 10)}T09:00:00.000Z`;
}

function buildBody(platform: CampaignPlatform, brief: MarketingCampaignBrief, type: CampaignDeliverableType, day: number): string {
  const pillar = brief.contentPillars[(day - 1) % brief.contentPillars.length] ?? "Campaign value";
  if (platform === "Email") {
    return `Subject: ${brief.brandContext.brandName} ${brief.offer}\n\nHi ${brief.audience},\n\n${pillar}: ${brief.goal}.\nOffer: ${brief.offer}.\nWhy now: this week we are focusing on fast wins for ${brief.audience}.\nCTA: ${brief.primaryCta}.`;
  }
  if (platform === "Blog / SEO") {
    return `Meta description: ${brief.brandContext.brandName} helps ${brief.audience} achieve ${brief.goal}.\n\nOutline:\n1) Core challenge for ${brief.audience}\n2) Practical framework from ${brief.brandContext.brandName}\n3) Offer spotlight: ${brief.offer}\n4) Conversion step: ${brief.primaryCta}`;
  }
  const opening = platform === "LinkedIn"
    ? `Leaders in ${brief.audience} keep seeing the same bottleneck: ${brief.goal}.`
    : `If you're ${brief.audience}, this is the fastest route to ${brief.goal}.`;
  const value = `${brief.brandContext.brandName} helps with ${pillar.toLowerCase()} by turning strategy into action.`;
  const close = `Next step: ${brief.primaryCta} at ${brief.brandContext.domain}.`;
  return `${opening} ${value} ${close} (${type.toUpperCase()} Day ${day})`;
}

export function buildDeliverableCopy(input: {
  brief: MarketingCampaignBrief;
  day: number;
  platform: CampaignPlatform;
  type: CampaignDeliverableType;
}): Omit<CampaignDeliverable, "metadata"> {
  const { brief, day, platform, type } = input;
  const rule = PLATFORM_RULES[platform];
  const pillar = brief.contentPillars[(day - 1) % brief.contentPillars.length] ?? "Campaign value";
  const hook = `${brief.brandContext.brandName}: ${rule.hookStyle} for ${brief.audience}`;
  const title = `${platform} Day ${day}: ${pillar}`;
  const body = buildBody(platform, brief, type, day);
  const visualPrompt = `${platform} creative for ${brief.brandContext.brandName}, ${pillar.toLowerCase()}, ${brief.toneOfVoice}, CTA '${brief.primaryCta}'`;
  return {
    day,
    dayLabel: `Day ${day}`,
    scheduledFor: buildDayDate(brief.startDate, day),
    platform,
    type,
    title,
    body,
    hook,
    cta: brief.primaryCta,
    hashtags: buildHashtags(platform, brief, rule.hashtagCount),
    recommendedAssetType: rule.recommendedAssetType,
    visualPrompt,
    status: "export_only",
  };
}
