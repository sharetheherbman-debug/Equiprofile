import type { StudioPreviewKind } from "@/components/marketing/previews";

export type QualityMode = "standard" | "elite";
export type StudioArea = "setup" | "create" | "campaigns" | "assets" | "autopilot";
export type SetupDrawerKind = "brand" | "audience" | "platforms" | "providers" | "diagnostics" | "presenter" | null;

export type MarketingStudioDraft = {
  id?: string;
  title?: string;
  platform?: string;
  format?: string;
  durationSeconds?: number | null;
  audience?: string;
  goal?: string;
  strategy?: string;
  hook?: string;
  script?: string;
  body?: string;
  shotList?: unknown;
  storyboard?: unknown;
  caption?: string;
  cta?: string;
  hashtags?: unknown;
  visualDirection?: string;
  voiceoverScript?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  avatarScript?: string;
  recommendedSchedule?: string;
  complianceNotes?: string;
  growthScore?: { overallScore?: number; reasons?: string[]; improvementSuggestions?: string[] } & Record<string, unknown>;
  mediaPlan?: string;
  mediaStatus?: string;
  recommendedMediaTask?: "text_to_image" | "text_to_video" | "avatar_video" | "text_to_speech" | null;
  nextActions?: unknown;
  plainText?: string;
};

export type StudioMediaState = {
  status: "idle" | "queued" | "preparing" | "routing" | "generating" | "rendering" | "processing" | "retrying" | "completed" | "failed" | "cancelled" | "setup_needed" | "scene_plan_required";
  task?: "text_to_image" | "text_to_video" | "avatar_video" | "text_to_speech";
  jobId?: string;
  assetId?: number | string;
  selectedProvider?: string;
  selectedModel?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  message?: string;
  progressPercent?: number;
  estimatedCompletionSeconds?: number;
  queuePosition?: number;
};

export type PlatformDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  previewKind: StudioPreviewKind;
  contentSupport: string;
  publishSupport: string;
  analyticsSupport: string;
  adsSupport?: string;
};

export const SUPPORTED_PLATFORMS: PlatformDefinition[] = [
  { id: "facebook-pages", label: "Facebook Pages", shortLabel: "Facebook", previewKind: "Facebook", contentSupport: "Posts, reels, captions and launch creative", publishSupport: "Connection flow required before direct publishing", analyticsSupport: "Page analytics planned after connection", adsSupport: "Ad creative supported as drafts" },
  { id: "instagram-business", label: "Instagram Business", shortLabel: "Instagram", previewKind: "Instagram", contentSupport: "Reels, captions, carousels and story prompts", publishSupport: "Connection flow required before direct publishing", analyticsSupport: "Insights planned after connection", adsSupport: "Creative briefs supported" },
  { id: "tiktok-business", label: "TikTok Business", shortLabel: "TikTok", previewKind: "TikTok", contentSupport: "Short scripts, hooks and shot lists", publishSupport: "Connection flow required before direct publishing", analyticsSupport: "Business analytics planned after connection" },
  { id: "youtube-shorts", label: "YouTube Shorts", shortLabel: "YouTube Shorts", previewKind: "YouTube Shorts", contentSupport: "Short scripts, hooks, titles and descriptions", publishSupport: "Connection flow required before direct publishing", analyticsSupport: "Channel analytics planned after connection" },
  { id: "youtube-long-form", label: "YouTube Long-form", shortLabel: "YouTube Long-form", previewKind: "YouTube Long-form", contentSupport: "Long-form scripts, outlines, titles and descriptions", publishSupport: "Connection flow required before direct publishing", analyticsSupport: "Channel analytics planned after connection" },
  { id: "linkedin-company-pages", label: "LinkedIn Company Pages", shortLabel: "LinkedIn", previewKind: "LinkedIn", contentSupport: "Authority posts, company updates and founder copy", publishSupport: "Connection flow required before direct publishing", analyticsSupport: "Company page analytics planned after connection" },
  { id: "google-business-profile", label: "Google Business Profile", shortLabel: "Google Business", previewKind: "Google Business", contentSupport: "Weekly local updates, offers and service posts", publishSupport: "Connection flow required before direct publishing", analyticsSupport: "Profile insights planned after connection" },
  { id: "email", label: "Email", shortLabel: "Email", previewKind: "Email", contentSupport: "Campaign emails, nurture copy and reactivation flows", publishSupport: "Uses existing campaign approval and SMTP path", analyticsSupport: "Reply and suppression safety remain active" },
  { id: "blog-seo", label: "Blog / SEO", shortLabel: "Blog", previewKind: "Blog", contentSupport: "SEO articles, outlines, titles and meta descriptions", publishSupport: "Export-ready drafts for the website workflow", analyticsSupport: "Search tracking planned after publishing workflow" },
];

export const QUICK_CREATE_LABELS = [
  "Reel / Short",
  "Social Post",
  "Ad Creative",
  "Email Campaign",
  "Blog / SEO Article",
  "YouTube Script",
  "Launch Campaign",
  "Weekly Content Pack",
  "Avatar Video",
];

export const EXAMPLE_PROMPTS = [
  "Create a 30-second Facebook reel for UK stable owners",
  "Build a 7-day launch campaign for riding schools",
  "Generate a week of YouTube Shorts for horse owners",
  "Write a LinkedIn authority post for equestrian business owners",
  "Create an email campaign for inactive trial users",
  "Create a Google Business update for this week",
];

export function stringifyList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function textFromUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => textFromUnknown(item)).filter(Boolean).join("\n");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map((item) => textFromUnknown(item)).filter(Boolean).join("\n");
  }
  return "";
}

export function normalizeDraftFromText(prompt: string, text: string): MarketingStudioDraft {
  const sections = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  let current = "body";
  for (const line of lines) {
    const match = line.match(/^\s*(strategy|hook|script|caption|cta|hashtags|visual direction|voiceover|media plan|schedule|compliance|growth score)\s*[:\-]\s*(.*)$/i);
    if (match) {
      current = match[1].toLowerCase();
      sections.set(current, match[2] || "");
    } else if (line.trim()) {
      sections.set(current, [sections.get(current), line.trim()].filter(Boolean).join("\n"));
    }
  }
  return {
    title: prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt,
    platform: prompt.toLowerCase().includes("facebook") ? "Facebook" : "Social",
    format: prompt.toLowerCase().includes("reel") ? "Reel" : "Campaign",
    strategy: sections.get("strategy") || "Position the campaign around a clear equestrian operations problem and a practical next step.",
    hook: sections.get("hook") || "",
    script: sections.get("script") || sections.get("body") || text,
    caption: sections.get("caption") || "",
    cta: sections.get("cta") || "Start your free trial",
    hashtags: stringifyList(sections.get("hashtags")),
    visualDirection: sections.get("visual direction") || "",
    voiceoverScript: sections.get("voiceover") || "",
    recommendedSchedule: sections.get("schedule") || "",
    complianceNotes: sections.get("compliance") || "Review before approval.",
    mediaPlan: sections.get("media plan") || "",
    plainText: text,
  };
}

export function draftHasContent(draft: MarketingStudioDraft | null): draft is MarketingStudioDraft {
  return !!draft && !!(draft.title || draft.script || draft.caption || draft.strategy || draft.plainText);
}
