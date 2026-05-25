import { Badge } from "@/components/ui/badge";
import { StudioPreviewCard } from "@/components/marketing/previews";

export type MarketingPreviewDraft = {
  title?: string;
  hook?: string;
  script?: string;
  caption?: string;
  cta?: string;
  hashtags?: unknown;
  imagePrompt?: string;
  videoPrompt?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "avatar";
  platform?: string;
  format?: string;
  durationSeconds?: number | null;
};

function toTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  }
  return [];
}

function platformTone(platform?: string) {
  const name = (platform || "Facebook").toLowerCase();
  if (name.includes("instagram")) return { label: "Instagram", accent: "from-fuchsia-500 to-orange-400", meta: "Reel/post preview" };
  if (name.includes("tiktok")) return { label: "TikTok", accent: "from-cyan-400 to-rose-500", meta: "Short video draft" };
  if (name.includes("youtube")) return { label: "YouTube", accent: "from-red-600 to-red-400", meta: "Short/script kit" };
  if (name.includes("linkedin")) return { label: "LinkedIn", accent: "from-sky-700 to-blue-500", meta: "Professional post" };
  if (name.includes("google")) return { label: "Google Business", accent: "from-blue-500 to-emerald-500", meta: "Business update" };
  if (name.includes("email")) return { label: "Email", accent: "from-slate-700 to-emerald-600", meta: "Campaign email" };
  return { label: "Facebook", accent: "from-blue-700 to-sky-500", meta: "Post/reel preview" };
}

export function PlatformPreview({ draft, draftMode = true }: { draft: MarketingPreviewDraft | null; draftMode?: boolean }) {
  const tone = platformTone(draft?.platform);
  const tags = toTags(draft?.hashtags);
  const headline = draft?.hook || draft?.title || "Your generated preview will appear here.";
  const body = draft?.caption || draft?.script || "Type a campaign request to preview copy, CTA, hashtags and media direction.";
  const cta = draft?.cta || "Start your free trial";
  const scheduleRecommendation = "Weekday morning or early evening (approval-first)";

  const canonicalKind =
    tone.label === "Google Business"
      ? "Blog"
      : tone.label === "Facebook" || tone.label === "Instagram" || tone.label === "TikTok" || tone.label === "YouTube" || tone.label === "LinkedIn" || tone.label === "Email"
        ? (tone.label as "Facebook" | "Instagram" | "TikTok" | "YouTube" | "LinkedIn" | "Email")
        : "Ad";

  return (
    <div className="space-y-3">
      <StudioPreviewCard
        payload={{
          kind: canonicalKind,
          title: headline,
          caption: body,
          cta,
          hashtags: tags,
          scheduleRecommendation,
          mediaUrl: draft?.mediaUrl,
          mediaType: draft?.mediaType === "avatar" ? "avatar" : draft?.mediaType === "video" ? "video" : draft?.mediaType === "image" ? "image" : undefined,
        }}
      />
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-950">
      <div className={`bg-gradient-to-r ${tone.accent} p-4 text-white`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">{tone.meta}</p>
            <h3 className="mt-1 text-xl font-bold">{tone.label}</h3>
          </div>
          {draftMode ? <Badge className="bg-white/20 text-white hover:bg-white/20">Draft mode</Badge> : null}
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-semibold">{headline}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
        </div>
        <div className="aspect-[9/12] overflow-hidden rounded-2xl border bg-slate-100 dark:bg-slate-900">
          {draft?.mediaUrl && draft.mediaType === "image" ? (
            <img src={draft.mediaUrl} alt="Generated campaign asset" className="h-full w-full object-cover" />
          ) : draft?.mediaUrl && (draft.mediaType === "video" || draft.mediaType === "avatar") ? (
            <video src={draft.mediaUrl} controls className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col justify-end bg-gradient-to-br from-slate-100 via-white to-emerald-50 p-4 text-sm dark:from-slate-900 dark:via-slate-950 dark:to-emerald-950">
              <p className="font-medium">Media direction</p>
              <p className="mt-2 text-muted-foreground">{draft?.imagePrompt || draft?.videoPrompt || "Prompt-only media plan appears here until a playable provider is ready."}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{draft?.format || "post"}</Badge>
          {draft?.durationSeconds ? <Badge variant="outline">{draft.durationSeconds}s</Badge> : null}
          <Badge variant="outline">CTA: {cta}</Badge>
        </div>
        {tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 8).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
    </div>
  );
}
