import type { CampaignDeliverable, CampaignPlatform, MarketingCampaignBrief } from "./campaignDeliverableTypes";
import { PLATFORM_RULES } from "./platformContentRules";

function runtimeForPlatform(platform: CampaignPlatform): number {
  if (platform === "YouTube") return 60;
  if (platform === "Facebook") return 30;
  if (platform === "Instagram") return 30;
  if (platform === "TikTok") return 25;
  return 30;
}

export function attachVideoPlanMetadata(
  deliverable: CampaignDeliverable,
  brief: MarketingCampaignBrief,
): CampaignDeliverable {
  if (deliverable.recommendedAssetType !== "video") return deliverable;
  const rule = PLATFORM_RULES[deliverable.platform];
  const contentType = rule.contentType;
  if (!contentType) return deliverable;

  const runtime = runtimeForPlatform(deliverable.platform);
  return {
    ...deliverable,
    metadata: {
      ...deliverable.metadata,
      contentType,
      videoPlan: {
        status: "studio_plan_required",
        capability: "assembled_video",
        suggestedRuntimeSeconds: runtime,
        planInput: {
          contentType,
          platform: deliverable.platform,
          goal: brief.goal,
          audience: brief.audience,
          brief: `${deliverable.hook} ${deliverable.body}`,
          script: `${deliverable.hook}. ${deliverable.body}`,
        },
        scenePlanSummary: [
          `Hook scene: ${deliverable.hook}`,
          `Value scene: ${brief.contentPillars[(deliverable.day - 1) % brief.contentPillars.length] ?? "Core value"}`,
          `CTA scene: ${deliverable.cta}`,
        ],
      },
    },
  };
}
