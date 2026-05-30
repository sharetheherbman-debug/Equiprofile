import { hasPlayablePublicAsset } from "@/components/marketing/studio/mediaStatus";
import type { MarketingAssetRow } from "./MarketingAppAssetStore";

export type AssetFilterId = "all" | "video" | "image" | "audio" | "draft_text" | "completed" | "failed_setup_needed";

export type MarketingCampaign = {
  id: string;
  name: string;
  goal: string;
  audience: string;
  channels: string[];
  startDate: string;
  durationDays: number;
  attachedAssetIds: number[];
  status: "draft" | "planned" | "approved" | "archived" | "session_only" | string;
  summary: string;
  planItems: CampaignPlanItem[];
  createdAt: string;
  updatedAt: string;
};

export type CampaignPlanItem = {
  id: string;
  dayOffset: number;
  title: string;
  channel: string;
  format: "video" | "image" | "text";
  objective: string;
  status: "draft" | "approved" | "export_only";
};

export type BrandKit = {
  brandName: string;
  domain: string;
  primaryCta: string;
  toneOfVoice: string;
  primaryColor: string;
  secondaryColor: string;
  overlayTemplate: "lower_third" | "corner_logo" | "end_card" | "social_reel" | "youtube_landscape";
  logoAssetId?: number | null;
  logoUrl?: string | null;
};

export type WeekColumn = {
  isoDate: string;
  label: string;
  items: Array<{
    id: string;
    title: string;
    channel: string;
    status: string;
  }>;
};

export type CalendarDraftItem = {
  id: string;
  title: string;
  channel: string;
  status: string;
  scheduledFor: string;
};

export const MARKETING_APP_CAMPAIGNS_STORAGE_KEY = "marketing-app-campaigns";

export const STARTER_PROMPTS = [
  "Create a horse video introducing EquiProfile",
  "Create a 7-day campaign for stable owners",
  "Make a Facebook launch post",
  "Create a YouTube Shorts script",
  "Generate a weekly content pack",
];

export const SOCIAL_CONNECTIONS = [
  { name: "Facebook", status: "not_connected", detail: "Export-only mode" },
  { name: "Instagram", status: "export_only", detail: "Export-only mode" },
  { name: "TikTok", status: "not_connected", detail: "Export-only mode" },
  { name: "LinkedIn", status: "export_only", detail: "Export-only mode" },
  { name: "YouTube", status: "not_connected", detail: "Export-only mode" },
] as const;

export function getAssetTitle(asset: MarketingAssetRow): string {
  const metadata = asset.metadata ?? {};
  const outputs = asset.outputs ?? {};
  const candidate = metadata.title ?? outputs.title ?? asset.generationPrompt ?? "Generated asset";
  return String(candidate);
}

export function getAssetStatus(asset: MarketingAssetRow): string {
  if (hasPlayablePublicAsset({ publicUrl: asset.publicUrl, mimeType: asset.mimeType })) return "completed";
  return String(asset.status ?? "draft").toLowerCase();
}

export function getAssetType(asset: MarketingAssetRow): "video" | "image" | "audio" | "draft_text" {
  const mimeType = String(asset.mimeType ?? "").toLowerCase();
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "draft_text";
}

export function filterMarketingAssets(
  assets: MarketingAssetRow[],
  filterId: AssetFilterId,
  searchTerm: string,
): MarketingAssetRow[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return assets
    .filter((asset) => String(asset.status ?? "").toLowerCase() !== "deleted")
    .filter((asset) => {
      if (!normalizedSearch) return true;
      const haystack = [getAssetTitle(asset), asset.generationPrompt ?? ""].join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    })
    .filter((asset) => {
      const status = getAssetStatus(asset);
      const type = getAssetType(asset);

      if (filterId === "all") return true;
      if (filterId === "video") return type === "video";
      if (filterId === "image") return type === "image";
      if (filterId === "audio") return type === "audio";
      if (filterId === "draft_text") return type === "draft_text";
      if (filterId === "completed") return status === "completed";
      return status === "failed" || status === "setup_needed";
    })
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
}

export function createCampaignPlanItems(campaign: Pick<MarketingCampaign, "id" | "goal" | "channels">): CampaignPlanItem[] {
  const channels = campaign.channels.length ? campaign.channels : ["General"];
  const formats: CampaignPlanItem["format"][] = ["video", "image", "text"];

  return Array.from({ length: 7 }, (_, index) => ({
    id: `${campaign.id}-day-${index + 1}`,
    dayOffset: index,
    title: `Day ${index + 1}: ${campaign.goal || "Campaign focus"}`,
    channel: channels[index % channels.length],
    format: formats[index % formats.length],
    objective:
      index === 0
        ? "Introduce the campaign promise"
        : index === 6
          ? "Close with a direct CTA"
          : "Move the audience to the next step",
    status: "export_only",
  }));
}

export function exportCampaignPlan(campaign: MarketingCampaign): string {
  return [
    `${campaign.name}`,
    `Goal: ${campaign.goal}`,
    `Audience: ${campaign.audience}`,
    `Channels: ${campaign.channels.join(", ") || "None selected"}`,
    `Start date: ${campaign.startDate || "Not scheduled"}`,
    `Duration: ${campaign.durationDays} days`,
    "",
    ...campaign.planItems.map(
      (item) => `Day ${item.dayOffset + 1} • ${item.channel} • ${item.format} • ${item.title} • ${item.objective}`,
    ),
  ].join("\n");
}

export function buildCalendarWeek(campaigns: MarketingCampaign[], scheduleDrafts: CalendarDraftItem[] = []): WeekColumn[] {
  const baseDate = new Date();
  const dayOfWeek = baseDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const isoDate = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

    const campaignItems = campaigns.flatMap((campaign) => {
      if (!campaign.startDate) return [];
      const startDate = new Date(`${campaign.startDate}T00:00:00`);
      return campaign.planItems.flatMap((item) => {
        const itemDate = new Date(startDate);
        itemDate.setDate(startDate.getDate() + item.dayOffset);
        return itemDate.toISOString().slice(0, 10) === isoDate
          ? [{ id: item.id, title: item.title, channel: item.channel, status: item.status }]
          : [];
      });
    });
    const draftItems = scheduleDrafts.flatMap((draft) =>
      draft.scheduledFor.slice(0, 10) === isoDate
        ? [{ id: draft.id, title: draft.title, channel: draft.channel, status: draft.status }]
        : [],
    );
    const items = [...campaignItems, ...draftItems];

    return { isoDate, label, items };
  });
}

export function buildBrandPreview(brandKit: BrandKit): string {
  return `${brandKit.brandName || "Your brand"} • ${brandKit.domain || "your-domain.com"} • ${brandKit.primaryCta || "Call to action"}`;
}

export function createSessionCampaign(input: {
  name: string;
  goal: string;
  audience: string;
  channels: string[];
  startDate: string;
  durationDays: number;
}): MarketingCampaign {
  const now = new Date().toISOString();
  const id = `campaign-${Math.random().toString(36).slice(2, 10)}`;

  return {
    id,
    name: input.name,
    goal: input.goal,
    audience: input.audience,
    channels: input.channels,
    startDate: input.startDate,
    durationDays: input.durationDays,
    attachedAssetIds: [],
    status: "session_only",
    summary: `${input.goal} for ${input.audience}`,
    planItems: createCampaignPlanItems({ id, goal: input.goal, channels: input.channels }),
    createdAt: now,
    updatedAt: now,
  };
}
