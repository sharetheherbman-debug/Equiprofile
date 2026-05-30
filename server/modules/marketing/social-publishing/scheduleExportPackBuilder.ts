/**
 * Schedule Export Pack Builder — PR50
 *
 * Builds platform-ready manual posting packs from marketingScheduleDrafts.
 * Groups by platform and day. Includes all required fields for each item.
 * Rejected items are excluded. needs_review items are clearly flagged.
 * No fake posting — this is export-only.
 */

export type ScheduleDraftRow = {
  id: number;
  tenantId: string;
  workspaceId: string;
  campaignId?: number | null;
  campaignItemId?: number | null;
  platform: string;
  title: string;
  content?: string | null;
  scheduledFor: string;
  status: string;
  reviewStatus: string;
  metadataJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleExportItem = {
  draftId: number;
  platform: string;
  title: string;
  body: string;
  hook: string;
  cta: string;
  hashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  assetUrls: string[];
  videoUrl: string | null;
  imageUrls: string[];
  captionFileUrl: string | null;
  reviewStatus: string;
  qaChecklistSummary: string | null;
  manualPostingInstructions: string[];
  characterWarnings: string[];
  exportChecklist: string[];
  needsReviewFlag: boolean;
  campaignId: number | null;
  campaignItemId: number | null;
};

export type ScheduleExportPlatformGroup = {
  platform: string;
  days: Array<{
    date: string;
    items: ScheduleExportItem[];
  }>;
};

export type ScheduleExportPack = {
  tenantId: string;
  workspaceId: string;
  generatedAt: string;
  totalItems: number;
  excludedRejected: number;
  platformGroups: ScheduleExportPlatformGroup[];
  manualPostingChecklist: string[];
};

const PLATFORM_CHAR_LIMITS: Record<string, number | undefined> = {
  Facebook: 63206,
  Instagram: 2200,
  TikTok: 2200,
  LinkedIn: 3000,
  YouTube: 5000,
  Email: 0, // no hard limit
  "Blog / SEO": 0,
};

const PLATFORM_INSTRUCTIONS: Record<string, string[]> = {
  Facebook: [
    "Log into Facebook and navigate to your Page.",
    "Create a new post and paste the copy.",
    "Attach any image or video asset listed.",
    "Schedule for the date/time shown or publish immediately.",
  ],
  Instagram: [
    "Open the Instagram app or Meta Business Suite.",
    "Create a new post, reel, or story as appropriate.",
    "Paste the caption and add hashtags from the list.",
    "Attach the image or video asset listed.",
    "Schedule via Creator Studio or Meta Business Suite.",
  ],
  TikTok: [
    "Open TikTok Studio or the TikTok app.",
    "Upload the video asset listed.",
    "Add the caption and hashtags from the list.",
    "Schedule for the date/time shown or post immediately.",
  ],
  LinkedIn: [
    "Log into LinkedIn and go to your Company Page or profile.",
    "Compose a new post and paste the copy.",
    "Attach any document, image, or video asset listed.",
    "Schedule via LinkedIn's native scheduler.",
  ],
  YouTube: [
    "Log into YouTube Studio.",
    "Upload the video asset listed.",
    "Use the title and description from this item.",
    "Add tags from the hashtags list.",
    "Schedule for the date/time shown.",
  ],
  Email: [
    "Log into your email marketing platform (e.g., Mailchimp, Klaviyo).",
    "Create a new campaign using the subject/title shown.",
    "Paste the body copy and CTA.",
    "Schedule for the date/time shown.",
  ],
  "Blog / SEO": [
    "Log into your CMS (e.g., WordPress, Webflow).",
    "Create a new blog post with the title shown.",
    "Paste the body copy and set the CTA link.",
    "Set the publish date/time shown.",
    "Add meta description from the copy excerpt.",
  ],
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function buildCharacterWarnings(platform: string, body: string): string[] {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  if (!limit) return [];
  const length = body.length;
  if (length > limit) {
    return [`Copy is ${length} characters — exceeds ${platform} limit of ${limit}. Trim before posting.`];
  }
  if (length > limit * 0.9) {
    return [`Copy is ${length} characters — near ${platform} limit of ${limit}.`];
  }
  return [];
}

function buildExportChecklist(item: ScheduleExportItem): string[] {
  const checklist: string[] = [
    `[ ] Confirm scheduled date/time: ${item.scheduledDate} ${item.scheduledTime}`,
    `[ ] Review copy and confirm no placeholder text remains`,
    `[ ] Confirm CTA is correct: "${item.cta || "none"}"`,
  ];
  if (item.assetUrls.length || item.videoUrl || item.imageUrls.length) {
    checklist.push(`[ ] Download and attach the listed asset(s) before posting`);
  } else {
    checklist.push(`[ ] Note: no assets attached — text-only post`);
  }
  if (item.hashtags.length) {
    checklist.push(`[ ] Add hashtags: ${item.hashtags.slice(0, 8).join(" ")}`);
  }
  if (item.captionFileUrl) {
    checklist.push(`[ ] Upload caption/subtitle file: ${item.captionFileUrl}`);
  }
  if (item.needsReviewFlag) {
    checklist.push(`[ ] ⚠️ NEEDS REVIEW — ensure this item is approved before posting`);
  }
  checklist.push(`[ ] Mark as posted in your CMS/social tool after publishing`);
  return checklist;
}

function buildItemFromDraft(draft: ScheduleDraftRow): ScheduleExportItem {
  const meta = parseJson<Record<string, unknown>>(draft.metadataJson, {});

  const hook = typeof meta.hook === "string" ? meta.hook : "";
  const cta = typeof meta.cta === "string" ? meta.cta : "";
  const hashtags = Array.isArray(meta.hashtags) ? meta.hashtags.map((tag) => String(tag)) : [];
  const assetUrls = Array.isArray(meta.assetUrls) ? meta.assetUrls.map((url) => String(url)) : [];
  const videoUrl = typeof meta.videoUrl === "string" ? meta.videoUrl : null;
  const imageUrls = Array.isArray(meta.imageUrls) ? meta.imageUrls.map((url) => String(url)) : [];
  const captionFileUrl = typeof meta.captionFileUrl === "string" ? meta.captionFileUrl : null;
  const qaChecklistSummary = typeof meta.qaChecklistSummary === "string" ? meta.qaChecklistSummary : null;

  const scheduledDate = draft.scheduledFor.slice(0, 10);
  const scheduledTime = draft.scheduledFor.slice(11, 16) || "09:00";
  const body = draft.content ?? "";

  const characterWarnings = buildCharacterWarnings(draft.platform, body);
  const needsReviewFlag = draft.reviewStatus === "needs_review" || draft.reviewStatus === "changes_requested";

  const item: ScheduleExportItem = {
    draftId: draft.id,
    platform: draft.platform,
    title: draft.title,
    body,
    hook,
    cta,
    hashtags,
    scheduledDate,
    scheduledTime,
    assetUrls,
    videoUrl,
    imageUrls,
    captionFileUrl,
    reviewStatus: draft.reviewStatus,
    qaChecklistSummary,
    manualPostingInstructions: PLATFORM_INSTRUCTIONS[draft.platform] ?? [
      "Log into the platform and create a new post.",
      "Paste the copy and attach any listed assets.",
      "Schedule for the date/time shown.",
    ],
    characterWarnings,
    exportChecklist: [],
    needsReviewFlag,
    campaignId: draft.campaignId ?? null,
    campaignItemId: draft.campaignItemId ?? null,
  };

  item.exportChecklist = buildExportChecklist(item);
  return item;
}

/**
 * Build a platform/day grouped export pack from a list of schedule drafts.
 * Drafts with status === "cancelled" or reviewStatus === "rejected" are excluded.
 */
export function buildScheduleExportPack(input: {
  tenantId: string;
  workspaceId: string;
  drafts: ScheduleDraftRow[];
}): ScheduleExportPack {
  const activeDrafts = input.drafts.filter(
    (draft) => draft.status !== "cancelled" && draft.reviewStatus !== "rejected",
  );
  const rejectedCount = input.drafts.length - activeDrafts.length;

  // Group by platform then by date
  const byPlatform = new Map<string, Map<string, ScheduleExportItem[]>>();
  for (const draft of activeDrafts) {
    const item = buildItemFromDraft(draft);
    if (!byPlatform.has(draft.platform)) {
      byPlatform.set(draft.platform, new Map());
    }
    const byDay = byPlatform.get(draft.platform)!;
    if (!byDay.has(item.scheduledDate)) {
      byDay.set(item.scheduledDate, []);
    }
    byDay.get(item.scheduledDate)!.push(item);
  }

  const platformGroups: ScheduleExportPlatformGroup[] = [];
  for (const [platform, byDay] of byPlatform) {
    const sortedDays = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
    platformGroups.push({ platform, days: sortedDays });
  }
  platformGroups.sort((a, b) => a.platform.localeCompare(b.platform));

  const manualPostingChecklist = [
    "[ ] Export pack generated — review all items before posting",
    "[ ] Confirm all approved items have reviewStatus: approved",
    "[ ] Download all asset files listed in each item",
    "[ ] Schedule or post each item on the correct platform",
    "[ ] Do NOT use the EquiProfile system to mark items as posted unless a real connector is active",
    "[ ] After manual posting, update your CMS/spreadsheet tracker",
  ];

  return {
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    generatedAt: new Date().toISOString(),
    totalItems: activeDrafts.length,
    excludedRejected: rejectedCount,
    platformGroups,
    manualPostingChecklist,
  };
}
