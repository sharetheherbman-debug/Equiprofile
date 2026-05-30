import type { MarketingBrandKitRecord } from "../brand-kit";
import type { CampaignEngineInput, MarketingCampaignBrief } from "./campaignDeliverableTypes";
import { PLATFORM_RULES, CORE_PLATFORM_ORDER, normalizePlatform } from "./platformContentRules";

function inferOffer(goal: string, brandName: string): string {
  const lowerGoal = goal.toLowerCase();
  if (lowerGoal.includes("signup") || lowerGoal.includes("trial")) return `Free trial of ${brandName}`;
  if (lowerGoal.includes("lead")) return `${brandName} discovery call`;
  if (lowerGoal.includes("book") || lowerGoal.includes("demo")) return `${brandName} live demo`;
  return `${brandName} core offer`;
}

function inferPrimaryCta(goal: string, brandKit: MarketingBrandKitRecord): string {
  const explicit = brandKit.primaryCta?.trim();
  if (explicit) return explicit;
  const lowerGoal = goal.toLowerCase();
  if (lowerGoal.includes("signup") || lowerGoal.includes("trial")) return "Start your free trial";
  if (lowerGoal.includes("book") || lowerGoal.includes("demo")) return "Book a demo";
  return "Learn more";
}

function inferContentPillars(goal: string, audience: string, brandName: string): string[] {
  const tokens = `${goal} ${audience}`.toLowerCase();
  const pillars = [
    tokens.includes("proof") || tokens.includes("results") ? "Proof and outcomes" : "Problem awareness",
    tokens.includes("how") || tokens.includes("guide") ? "How-to education" : "Practical education",
    tokens.includes("offer") || tokens.includes("trial") ? "Offer activation" : "Conversion pathway",
    `${brandName} differentiation`,
  ];
  return Array.from(new Set(pillars));
}

function resolveChannels(channels: string[]): MarketingCampaignBrief["channels"] {
  const normalized = channels
    .map((channel) => normalizePlatform(channel))
    .filter(Boolean) as MarketingCampaignBrief["channels"];
  const unique = Array.from(new Set(normalized));
  if (unique.length) return unique;
  return CORE_PLATFORM_ORDER;
}

function resolveSuccessMetrics(goal: string): string[] {
  const lowerGoal = goal.toLowerCase();
  if (lowerGoal.includes("signup") || lowerGoal.includes("trial")) {
    return ["Trial signups", "Landing page conversion rate", "Qualified lead volume"];
  }
  if (lowerGoal.includes("lead")) {
    return ["Inbound lead count", "Booked calls", "Cost per qualified lead"];
  }
  return ["Reach by platform", "Engagement rate", "CTA click-through rate"];
}

export function buildCampaignBrief(input: CampaignEngineInput): MarketingCampaignBrief {
  const { campaign, brandKit } = input;
  const channels = resolveChannels(campaign.channels);
  const generatedAt = new Date().toISOString();
  const platformStrategy = Object.fromEntries(
    channels.map((platform) => [platform, PLATFORM_RULES[platform].strategy]),
  ) as MarketingCampaignBrief["platformStrategy"];

  const safeGoal = campaign.goal?.trim() || `Promote ${campaign.name}`;
  const safeAudience = campaign.audience?.trim() || brandKit.targetAudience?.trim() || "Ideal buyers";

  return {
    campaignId: campaign.id,
    tenantId: campaign.tenantId,
    workspaceId: campaign.workspaceId,
    hostAppId: campaign.hostAppId,
    brandKitId: brandKit.id ?? null,
    campaignName: campaign.name,
    goal: safeGoal,
    audience: safeAudience,
    offer: inferOffer(safeGoal, brandKit.brandName),
    primaryCta: inferPrimaryCta(safeGoal, brandKit),
    channels,
    startDate: campaign.startDate ?? generatedAt.slice(0, 10),
    durationDays: Math.max(1, campaign.durationDays || 7),
    toneOfVoice: brandKit.toneOfVoice || "professional and helpful",
    brandContext: {
      brandName: brandKit.brandName,
      domain: brandKit.domain,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      overlayTemplate: brandKit.overlayTemplate,
      logoUrl: brandKit.logoUrl,
    },
    platformStrategy,
    contentPillars: inferContentPillars(safeGoal, safeAudience, brandKit.brandName),
    successMetrics: resolveSuccessMetrics(safeGoal),
    constraints: [
      "No fake posted status",
      "Default status must remain export_only or draft",
      "Video deliverables must use Studio plan metadata",
      "No raw provider render in campaign generation",
    ],
    generatedAt,
  };
}
