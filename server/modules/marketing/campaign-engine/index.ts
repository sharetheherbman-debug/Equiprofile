import type { MarketingBrandKitRecord } from "../brand-kit";
import type { MarketingCampaignItemStatus, MarketingCampaignItemType } from "../../growth-engine";
import { buildCampaignBrief } from "./campaignBriefBuilder";
import { buildCampaignDeliverables } from "./campaignDeliverablePlanner";
import { buildCampaignExportPack } from "./campaignExportPackBuilder";
import type { CampaignExportPack, CampaignSourceRecord, MarketingCampaignBrief } from "./campaignDeliverableTypes";

export * from "./campaignDeliverableTypes";
export * from "./campaignBriefBuilder";
export * from "./campaignDeliverablePlanner";
export * from "./platformContentRules";
export * from "./campaignCopyGenerator";
export * from "./campaignVideoPlanner";
export * from "./campaignExportPackBuilder";
export * from "./campaignQualityRules";

export async function createCampaignEngineOutput(input: {
  campaign: CampaignSourceRecord;
  brandKit: MarketingBrandKitRecord;
}) {
  const brief = buildCampaignBrief(input);
  const deliverables = await buildCampaignDeliverables(brief);
  return { brief, deliverables };
}

export function mapDeliverableTypeToCampaignItemType(type: string): MarketingCampaignItemType {
  if (type === "campaign_plan") return "post";
  return (type as MarketingCampaignItemType);
}

export function toCampaignItemMetadata(input: {
  brief: MarketingCampaignBrief;
  deliverable: Awaited<ReturnType<typeof buildCampaignDeliverables>>[number];
}) {
  return {
    day: input.deliverable.day,
    dayLabel: input.deliverable.dayLabel,
    hook: input.deliverable.hook,
    cta: input.deliverable.cta,
    hashtags: input.deliverable.hashtags,
    recommendedAssetType: input.deliverable.recommendedAssetType,
    visualPrompt: input.deliverable.visualPrompt,
    briefId: input.brief.campaignId,
    platformRule: input.deliverable.metadata.platformRule,
    qualityChecks: input.deliverable.metadata.qualityChecks,
    generationMode: input.deliverable.metadata.generationMode,
    provider: input.deliverable.metadata.provider ?? null,
    model: input.deliverable.metadata.model ?? null,
    selectedProvider: input.deliverable.metadata.selectedProvider ?? null,
    selectedModel: input.deliverable.metadata.selectedModel ?? null,
    executedProvider: input.deliverable.metadata.executedProvider ?? null,
    executedModel: input.deliverable.metadata.executedModel ?? null,
    routeEnforced: input.deliverable.metadata.routeEnforced ?? false,
    routeMismatchReason: input.deliverable.metadata.routeMismatchReason ?? null,
    task: input.deliverable.metadata.task,
    mode: input.deliverable.metadata.mode,
    routeReason: input.deliverable.metadata.routeReason,
    fallbackReason: input.deliverable.metadata.fallbackReason ?? null,
    estimatedCostTier: input.deliverable.metadata.estimatedCostTier ?? null,
    generatedAt: input.deliverable.metadata.generatedAt,
    parserWarnings: input.deliverable.metadata.parserWarnings ?? [],
    providerStatus: input.deliverable.metadata.providerStatus,
    contentType: input.deliverable.metadata.contentType,
    videoPlan: input.deliverable.metadata.videoPlan,
  };
}

export function toWeeklyDraftPayload(input: {
  campaignId: number;
  tenantId: string;
  workspaceId: string;
  items: Array<{
    id: number;
    platform: string | null;
    title: string | null;
    content: string | null;
    scheduledFor: string | null;
    status: MarketingCampaignItemStatus;
    reviewStatus?: "needs_review" | "approved" | "rejected" | "changes_requested" | "blocked" | "exported";
    metadata: Record<string, unknown>;
  }>;
}) {
  return input.items.map((item) => {
    const metadata = item.metadata ?? {};
    const hashtags = Array.isArray(metadata.hashtags) ? metadata.hashtags.map((tag) => String(tag)).join(" ") : "";
    const hook = typeof metadata.hook === "string" ? metadata.hook : "";
    const cta = typeof metadata.cta === "string" ? metadata.cta : "";
    const asset = typeof metadata.recommendedAssetType === "string" ? metadata.recommendedAssetType : "text";
    const combined = [item.content ?? "", hook ? `Hook: ${hook}` : "", cta ? `CTA: ${cta}` : "", hashtags ? `Hashtags: ${hashtags}` : "", `Asset: ${asset}`]
      .filter(Boolean)
      .join("\n\n");
    return {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      campaignItemId: item.id,
      platform: item.platform || "General",
      title: item.title || "Campaign item",
      content: combined,
      scheduledFor: item.scheduledFor ?? new Date().toISOString(),
      status: item.status === "approved" && item.reviewStatus === "approved" ? "approved" as const : "export_only" as const,
    };
  });
}

export function buildCampaignPackFromStoredData(input: {
  brief: MarketingCampaignBrief;
  deliverables: Awaited<ReturnType<typeof buildCampaignDeliverables>>;
  linkedAssets: CampaignExportPack["linkedAssets"];
}) {
  return buildCampaignExportPack({
    brief: input.brief,
    deliverables: input.deliverables,
    linkedAssets: input.linkedAssets,
  });
}
