import type { CampaignDeliverable, CampaignDeliverableType, MarketingCampaignBrief } from "./campaignDeliverableTypes";
import { buildDeliverableCopy } from "./campaignCopyGenerator";
import { attachVideoPlanMetadata } from "./campaignVideoPlanner";
import { CORE_PLATFORM_ORDER, PLATFORM_RULES } from "./platformContentRules";
import { defaultQualityChecks, validateDeliverableQuality } from "./campaignQualityRules";
import { executeMarketingModelTask, buildMarketingRouteMetadata } from "../model-execution";

function deliverableTypeFor(platform: (typeof CORE_PLATFORM_ORDER)[number]): CampaignDeliverableType {
  return PLATFORM_RULES[platform].defaultType;
}

function resolvePlatformSequence(brief: MarketingCampaignBrief): (typeof CORE_PLATFORM_ORDER)[number][] {
  const selected = brief.channels.length ? brief.channels : CORE_PLATFORM_ORDER;
  const base = Array.from(new Set([...selected, ...CORE_PLATFORM_ORDER]));
  return base as (typeof CORE_PLATFORM_ORDER)[number][];
}

function modelTaskFor(type: CampaignDeliverableType): "platform_copywriting" | "email_generation" | "blog_seo_generation" {
  if (type === "email") return "email_generation";
  if (type === "blog") return "blog_seo_generation";
  return "platform_copywriting";
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const next = value.map((entry) => String(entry).trim()).filter(Boolean);
  return next.length ? next : fallback;
}

function mergeModelOutput(base: Omit<CampaignDeliverable, "metadata">, output: Record<string, unknown>): Omit<CampaignDeliverable, "metadata"> {
  return {
    ...base,
    title: asString(output.title, base.title),
    hook: asString(output.hook, base.hook),
    body: asString(output.body, base.body),
    cta: asString(output.cta, base.cta),
    hashtags: asList(output.hashtags, base.hashtags),
    visualPrompt: asString(output.visualPrompt, base.visualPrompt),
  };
}

export async function buildCampaignDeliverables(brief: MarketingCampaignBrief): Promise<CampaignDeliverable[]> {
  const platforms = resolvePlatformSequence(brief);
  const days = Math.max(1, brief.durationDays);
  const deliverables: CampaignDeliverable[] = [];

  for (let day = 1; day <= days; day++) {
    const platform = platforms[(day - 1) % platforms.length];
    const type = deliverableTypeFor(platform);
    const deterministic = buildDeliverableCopy({ brief, day, platform, type });
    const execution = await executeMarketingModelTask({
      tenantId: brief.tenantId,
      workspaceId: brief.workspaceId,
      hostAppId: brief.hostAppId,
      mode: "standard",
      task: modelTaskFor(type),
      brandKit: brief.brandContext as Record<string, unknown>,
      campaignBrief: brief as unknown as Record<string, unknown>,
      platform,
      contentType: type,
      language: "English",
      audience: brief.audience,
      offer: brief.offer,
      constraints: ["Return campaign-safe copy.", "No empty hook/body/cta.", "reviewStatus must be needs_review."],
    });

    const copy = mergeModelOutput(deterministic, execution.output);
    const qualityChecks = defaultQualityChecks();
    const routeMeta = buildMarketingRouteMetadata(execution);

    let deliverable: CampaignDeliverable = {
      ...copy,
      metadata: {
        platformRule: PLATFORM_RULES[platform].strategy,
        qualityChecks,
        ...routeMeta,
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
