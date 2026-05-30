import type { BeastModeBuildInput, BeastModeBrief } from "./beastModeTypes";

function normalizeLanguages(languages: BeastModeBuildInput["requestedLanguages"]) {
  return languages.length ? languages : (["English"] as BeastModeBuildInput["requestedLanguages"]);
}

function normalizePlatforms(platforms: BeastModeBuildInput["requestedPlatforms"], channels: string[]) {
  return platforms.length ? platforms : (channels.length ? channels : ["Facebook"]) as BeastModeBuildInput["requestedPlatforms"];
}

export function buildBeastModeBrief(input: BeastModeBuildInput): BeastModeBrief {
  return {
    tenantId: input.campaign.tenantId,
    workspaceId: input.campaign.workspaceId,
    hostAppId: input.campaign.hostAppId,
    campaignId: input.campaign.id,
    brandKitId: input.brandKit.id,
    campaignName: input.campaign.name,
    goal: input.campaign.goal,
    audience: input.campaign.audience,
    offer: input.brandKit.tagline ?? input.campaign.goal,
    primaryCta: input.brandKit.primaryCta,
    mode: input.mode,
    requestedVariantCount: Math.max(1, input.requestedVariantCount),
    requestedPlatforms: normalizePlatforms(input.requestedPlatforms, input.campaign.channels),
    requestedLanguages: normalizeLanguages(input.requestedLanguages),
    brandSummary: {
      brandName: input.brandKit.brandName,
      domain: input.brandKit.domain,
      toneOfVoice: input.brandKit.toneOfVoice,
      primaryColor: input.brandKit.primaryColor,
      secondaryColor: input.brandKit.secondaryColor,
      logoUrl: input.brandKit.logoUrl,
      overlayTemplate: input.brandKit.overlayTemplate,
    },
    productNames: [input.brandKit.brandName],
    generatedAt: new Date().toISOString(),
  };
}
