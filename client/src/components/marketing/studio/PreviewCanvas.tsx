import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudioPreviewCard, type StudioPreviewKind } from "@/components/marketing/previews";
import { stringifyList, type MarketingStudioDraft, type StudioMediaState } from "./types";

function resolveKind(platform?: string): StudioPreviewKind {
  const value = (platform || "").toLowerCase();
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("long")) return "YouTube Long-form";
  if (value.includes("short")) return "YouTube Shorts";
  if (value.includes("youtube")) return "YouTube";
  if (value.includes("linkedin")) return "LinkedIn";
  if (value.includes("google")) return "Google Business";
  if (value.includes("email")) return "Email";
  if (value.includes("blog")) return "Blog";
  return "Facebook";
}

function mediaLabel(mediaState?: StudioMediaState) {
  if (!mediaState || mediaState.status === "idle") return "Script ready";
  if (mediaState.status === "queued") return "Queued";
  if (mediaState.status === "preparing") return "Preparing";
  if (mediaState.status === "routing") return "Routing";
  if (mediaState.status === "generating") return "Generating";
  if (mediaState.status === "rendering") return "Rendering";
  if (mediaState.status === "processing") return "Processing";
  if (mediaState.status === "retrying") return "Retrying";
  if (mediaState.status === "completed") return "Video ready";
  if (mediaState.status === "setup_needed") return "Video model missing";
  if (mediaState.status === "scene_plan_required") return "Scene plan required";
  if (mediaState.status === "cancelled") return "Cancelled";
  return "Video failed";
}

export function PreviewCanvas({ draft, mediaState, onRetryGenX }: { draft: MarketingStudioDraft | null; mediaState?: StudioMediaState; onRetryGenX?: () => void }) {
  const kind = resolveKind(draft?.platform);
  const mediaUrl = mediaState?.publicUrl ?? null;
  const mime = mediaState?.mimeType ?? "";
  return (
    <aside className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm" aria-label="Preview Canvas">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Preview</p>
          <p className="text-xs text-stone-400">Platform content preview</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">{kind}</Badge>
          <Badge className={`rounded-full border px-3 py-1 text-xs ${
            mediaState?.status === "completed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : mediaState?.status === "failed" || mediaState?.status === "setup_needed"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-stone-200 bg-stone-50 text-stone-600"
          }`}>{mediaLabel(mediaState)}</Badge>
        </div>
      </div>
      {mediaUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-stone-200 bg-stone-950">
          {mime.startsWith("video/") ? (
            <video src={mediaUrl} controls autoPlay muted loop className="aspect-video w-full object-cover" aria-label="Generated video preview" />
          ) : mime.startsWith("image/") ? (
            <img src={mediaUrl} alt="Generated media preview" className="aspect-video w-full object-cover" />
          ) : mime.startsWith("audio/") ? (
            <div className="p-4"><audio src={mediaUrl} controls className="w-full" aria-label="Generated voice preview" /></div>
          ) : null}
        </div>
      ) : mediaState?.status && mediaState.status !== "idle" ? (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          <p className="font-medium text-stone-800">{mediaLabel(mediaState)}</p>
          {mediaState.message ? <p className="mt-1 text-xs leading-5 text-stone-500">{mediaState.message}</p> : null}
          {typeof mediaState.progressPercent === "number" ? (
            <p className="mt-1 text-xs leading-5 text-stone-500">Progress: {mediaState.progressPercent}%</p>
          ) : null}
          {typeof mediaState.estimatedCompletionSeconds === "number" && mediaState.estimatedCompletionSeconds > 0 ? (
            <p className="text-xs leading-5 text-stone-500">ETA: ~{mediaState.estimatedCompletionSeconds}s</p>
          ) : null}
          {typeof mediaState.queuePosition === "number" && mediaState.queuePosition > 0 ? (
            <p className="text-xs leading-5 text-stone-500">Queue position: {mediaState.queuePosition}</p>
          ) : null}
          {(mediaState.status === "failed" || mediaState.status === "setup_needed") && onRetryGenX ? (
            <Button type="button" size="sm" variant="outline" className="mt-3 rounded-xl border-stone-200" onClick={onRetryGenX}>
              Retry with GenX
            </Button>
          ) : null}
        </div>
      ) : null}
      <StudioPreviewCard
        payload={{
          kind,
          title: draft?.title || "Create a campaign to preview it here",
          caption: draft?.caption || draft?.script || draft?.strategy || "Your generated caption, script and CTA will update this preview immediately.",
          script: draft?.script,
          cta: draft?.cta,
          hashtags: stringifyList(draft?.hashtags),
          scheduleRecommendation: draft?.recommendedSchedule,
        }}
      />
    </aside>
  );
}
