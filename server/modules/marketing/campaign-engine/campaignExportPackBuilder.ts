import type { CampaignDeliverable, CampaignExportPack, MarketingCampaignBrief } from "./campaignDeliverableTypes";
import { summarizeMarketingRouting } from "../model-execution";

function groupByPlatform(items: CampaignDeliverable[]): Record<string, CampaignDeliverable[]> {
  return items.reduce<Record<string, CampaignDeliverable[]>>((acc, item) => {
    const key = item.platform;
    (acc[key] ??= []).push(item);
    return acc;
  }, {});
}

function buildCalendar(items: CampaignDeliverable[]): CampaignExportPack["dayByDayCalendar"] {
  const byDay = items.reduce<Map<number, CampaignDeliverable[]>>((acc, item) => {
    const current = acc.get(item.day) ?? [];
    current.push(item);
    acc.set(item.day, current);
    return acc;
  }, new Map());

  return Array.from(byDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, dayItems]) => ({
      day,
      date: dayItems[0]?.scheduledFor.slice(0, 10) ?? "unscheduled",
      items: dayItems,
    }));
}

function buildMarkdown(pack: Omit<CampaignExportPack, "markdown">): string {
  const lines: string[] = [];
  lines.push(`# ${pack.campaignBrief.campaignName}`);
  lines.push(`- Goal: ${pack.campaignBrief.goal}`);
  lines.push(`- Audience: ${pack.campaignBrief.audience}`);
  lines.push(`- Offer: ${pack.campaignBrief.offer}`);
  lines.push(`- CTA: ${pack.campaignBrief.primaryCta}`);
  lines.push(`- Brand: ${pack.brandSummary.brandName} (${pack.brandSummary.domain})`);
  lines.push("");
  lines.push("## Day-by-day calendar");
  for (const day of pack.dayByDayCalendar) {
    lines.push(`### Day ${day.day} (${day.date})`);
    for (const item of day.items) {
      lines.push(`- ${item.platform} • ${item.type} • ${item.title}`);
      lines.push(`  - Review: ${item.reviewStatus ?? "needs_review"}`);
      lines.push(`  - Exported: ${item.exported ? "yes" : "no"}`);
      lines.push(`  - Hook: ${item.hook}`);
      lines.push(`  - CTA: ${item.cta}`);
      lines.push(`  - Copy: ${item.body}`);
      if (item.hashtags.length) lines.push(`  - Hashtags: ${item.hashtags.join(" ")}`);
      if (item.metadata.videoPlan) {
        lines.push(`  - Video plan: ${item.metadata.videoPlan.planInput.contentType} (${item.metadata.videoPlan.suggestedRuntimeSeconds}s)`);
      }
      if (item.metadata.generationMode) {
        lines.push(`  - Generation: ${item.metadata.generationMode}${item.metadata.provider ? ` (${item.metadata.provider}/${item.metadata.model ?? "default"})` : ""}`);
      }
      if (item.metadata.fallbackReason) {
        lines.push(`  - Fallback reason: ${item.metadata.fallbackReason}`);
      }
      if (item.metadata.reviewChecklist?.length) {
        lines.push(`  - QA: ${item.metadata.reviewChecklist.join("; ")}`);
      }
      if (item.metadata.reviewQaScore) {
        lines.push(`  - QA score: ${item.metadata.reviewQaScore.score}% (${item.metadata.reviewQaScore.pass ? "pass" : "fail"})`);
      }
      if (item.metadata.reviewChecklistSummary) {
        lines.push(`  - QA summary: ${item.metadata.reviewChecklistSummary.passed}/${item.metadata.reviewChecklistSummary.total} passed; ${item.metadata.reviewChecklistSummary.blockingFailures} blocking failures`);
      }
      if (item.metadata.reviewReason) {
        lines.push(`  - Review reason: ${item.metadata.reviewReason}`);
      }
      if (item.metadata.manualOverride?.used) {
        lines.push(`  - Manual override: ${item.metadata.manualOverride.action} (${item.metadata.manualOverride.reason})`);
      }
    }
  }
  lines.push("");
  lines.push("## Manual posting checklist");
  for (const step of pack.manualPostingChecklist) lines.push(`- ${step}`);
  lines.push("");
  lines.push("## QA checklist");
  for (const step of pack.qaChecklist) lines.push(`- ${step}`);
  return lines.join("\n");
}

export function buildCampaignExportPack(input: {
  brief: MarketingCampaignBrief;
  deliverables: CampaignDeliverable[];
  linkedAssets: CampaignExportPack["linkedAssets"];
  generatedAt?: string;
}): CampaignExportPack {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const groupedPlatformDeliverables = groupByPlatform(input.deliverables);
  const hashtags = Array.from(new Set(input.deliverables.flatMap((item) => item.hashtags))).filter(Boolean);
  const emailCopy = input.deliverables
    .filter((item) => item.platform === "Email")
    .map((item) => ({ subject: item.title, body: item.body, cta: item.cta }));
  const blogSeoCopy = input.deliverables
    .filter((item) => item.platform === "Blog / SEO")
    .map((item) => ({
      title: item.title,
      outline: [
        `Audience challenge: ${input.brief.audience}`,
        `Approach: ${input.brief.offer}`,
        `CTA: ${item.cta}`,
      ],
      metaDescription: `${input.brief.brandContext.brandName} helps ${input.brief.audience} achieve ${input.brief.goal}.`,
    }));
  const videoScripts = input.deliverables
    .filter((item) => item.recommendedAssetType === "video")
    .map((item) => ({
      platform: item.platform,
      title: item.title,
      script: `${item.hook}. ${item.body}`,
      scenePlanSummary: item.metadata.videoPlan?.scenePlanSummary,
    }));
  const modelRoutingSummary = summarizeMarketingRouting({
    entries: input.deliverables.map((item) => ({
      provider: item.metadata.provider ?? null,
      generationMode: item.metadata.generationMode ?? "fallback",
      status: item.metadata.providerStatus === "setup_needed"
        ? "setup_needed"
        : item.metadata.providerStatus === "provider_unavailable"
          ? "provider_unavailable"
          : "completed",
      mode: item.metadata.mode ?? "standard",
    })),
  });

  const packWithoutMarkdown: Omit<CampaignExportPack, "markdown"> = {
    campaignBrief: input.brief,
    brandSummary: input.brief.brandContext,
    groupedPlatformDeliverables,
    dayByDayCalendar: buildCalendar(input.deliverables),
    copyBlocks: input.deliverables.map((item) => ({
      platform: item.platform,
      title: item.title,
      body: item.body,
      cta: item.cta,
    })),
    hashtags,
    emailCopy,
    blogSeoCopy,
    videoScripts,
    linkedAssets: input.linkedAssets,
    manualPostingChecklist: [
      "Confirm each deliverable copy, hook, and CTA before publishing.",
      "Upload recommended assets in native platform editors.",
      "Keep posting mode as export_only unless connector is explicitly ready.",
      "Record final post URLs back in campaign notes.",
    ],
    qaChecklist: [
      "No placeholder copy remains.",
      "Platform tone matches destination channel.",
      "CTA and offer are consistent with the brand kit.",
      "Video items include Studio plan metadata and are not auto-rendered.",
    ],
    reviewSummary: input.deliverables.map((item) => ({
      campaignItemId: Number((item.metadata as Record<string, unknown>).campaignItemId ?? NaN) || null,
      platform: item.platform,
      title: item.title,
      reviewStatus: item.reviewStatus ?? "needs_review",
      exported: Boolean(item.exported),
      qaScore: item.metadata.reviewQaScore ?? null,
      checklistSummary: item.metadata.reviewChecklistSummary ?? null,
      manualOverride: item.metadata.manualOverride ?? null,
      checklist: item.metadata.reviewChecklist ?? [],
      reason: item.metadata.reviewReason ?? null,
    })),
    modelRoutingSummary,
    generatedAt,
  };

  return {
    ...packWithoutMarkdown,
    markdown: buildMarkdown(packWithoutMarkdown),
  };
}
