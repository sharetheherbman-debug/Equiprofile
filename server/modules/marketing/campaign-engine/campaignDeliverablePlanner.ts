import type { CampaignDeliverable, CampaignDeliverableType, MarketingCampaignBrief } from "./campaignDeliverableTypes";
import { buildDeliverableCopy } from "./campaignCopyGenerator";
import { attachVideoPlanMetadata } from "./campaignVideoPlanner";
import { CORE_PLATFORM_ORDER, PLATFORM_RULES } from "./platformContentRules";
import { defaultQualityChecks, validateDeliverableQuality } from "./campaignQualityRules";

function deliverableTypeFor(platform: (typeof CORE_PLATFORM_ORDER)[number]): CampaignDeliverableType {
  return PLATFORM_RULES[platform].defaultType;
}

function resolvePlatformSequence(brief: MarketingCampaignBrief): (typeof CORE_PLATFORM_ORDER)[number][] {
  const selected = brief.channels.length ? brief.channels : CORE_PLATFORM_ORDER;
  const base = Array.from(new Set([...selected, ...CORE_PLATFORM_ORDER]));
  return base as (typeof CORE_PLATFORM_ORDER)[number][];
}

export function buildCampaignDeliverables(brief: MarketingCampaignBrief): CampaignDeliverable[] {
  const platforms = resolvePlatformSequence(brief);
  const days = Math.max(1, brief.durationDays);
  const deliverables: CampaignDeliverable[] = [];

  for (let day = 1; day <= days; day++) {
    const platform = platforms[(day - 1) % platforms.length];
    const type = deliverableTypeFor(platform);
    const copy = buildDeliverableCopy({ brief, day, platform, type });
    const qualityChecks = defaultQualityChecks();

    let deliverable: CampaignDeliverable = {
      ...copy,
      metadata: {
        platformRule: PLATFORM_RULES[platform].strategy,
        qualityChecks,
      },
    };

    deliverable = attachVideoPlanMetadata(deliverable, brief);
    const failures = validateDeliverableQuality(deliverable);
    if (failures.length) {
      throw new Error(`Campaign deliverable quality check failed for ${platform} day ${day}: ${failures.join(", ")}`);
    }

    deliverables.push(deliverable);
  }

  return deliverables;
}
