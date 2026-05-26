import { Badge } from "@/components/ui/badge";

export type StudioPreviewKind =
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "YouTube Shorts"
  | "YouTube Long-form"
  | "LinkedIn"
  | "Google Business"
  | "Email"
  | "Blog"
  | "Carousel"
  | "Ad";

export type StudioPreviewPayload = {
  kind: StudioPreviewKind;
  title?: string;
  caption?: string;
  script?: string;
  cta?: string;
  hashtags?: string[];
  scheduleRecommendation?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "avatar";
};

function KindAccent({ kind }: { kind: StudioPreviewKind }) {
  const byKind: Record<StudioPreviewKind, string> = {
    Facebook: "from-blue-700 to-sky-500",
    Instagram: "from-fuchsia-500 to-orange-400",
    TikTok: "from-cyan-400 to-rose-500",
    YouTube: "from-red-600 to-red-400",
    "YouTube Shorts": "from-red-600 to-rose-500",
    "YouTube Long-form": "from-red-700 to-orange-500",
    LinkedIn: "from-sky-700 to-blue-500",
    "Google Business": "from-blue-600 to-emerald-500",
    Email: "from-slate-700 to-emerald-600",
    Blog: "from-indigo-700 to-violet-600",
    Carousel: "from-purple-600 to-fuchsia-500",
    Ad: "from-emerald-700 to-lime-500",
  };
  return <div className={`h-1.5 w-full bg-gradient-to-r ${byKind[kind]}`} />;
}

function PreviewMedia({ payload }: { payload: StudioPreviewPayload }) {
  if (payload.mediaUrl && payload.mediaType === "image") {
    return <img src={payload.mediaUrl} alt="Generated media" className="h-full w-full object-cover" />;
  }
  if (payload.mediaUrl && (payload.mediaType === "video" || payload.mediaType === "avatar")) {
    return <video src={payload.mediaUrl} controls className="h-full w-full object-cover" />;
  }
  if (payload.mediaUrl && payload.mediaType === "audio") {
    return <audio src={payload.mediaUrl} controls className="w-full" />;
  }

  return (
    <div className="flex h-full items-end bg-gradient-to-br from-slate-100 via-white to-emerald-50 p-4 text-sm dark:from-slate-900 dark:via-slate-950 dark:to-emerald-950">
      <p className="text-muted-foreground">Media preview appears here when playable media is available; script/storyboard output remains truthful meanwhile.</p>
    </div>
  );
}

export function StudioPreviewCard({ payload }: { payload: StudioPreviewPayload }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-950">
      <KindAccent kind={payload.kind} />
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h3 className="text-base font-semibold">{payload.kind} preview</h3>
        <Badge variant="outline">Live preview</Badge>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-semibold">{payload.title || "Generated campaign output"}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{payload.caption || payload.script || "Content will appear after generation."}</p>
        </div>
        <div className="aspect-[9/12] overflow-hidden rounded-2xl border bg-slate-100 dark:bg-slate-900">
          <PreviewMedia payload={payload} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {payload.cta ? <Badge variant="outline">CTA: {payload.cta}</Badge> : null}
          {payload.scheduleRecommendation ? <Badge variant="secondary">Schedule: {payload.scheduleRecommendation}</Badge> : null}
        </div>
        {payload.hashtags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {payload.hashtags.slice(0, 10).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{tag.startsWith("#") ? tag : `#${tag}`}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
