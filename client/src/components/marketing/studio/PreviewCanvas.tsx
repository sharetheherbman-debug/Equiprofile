import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudioPreviewCard, type StudioPreviewKind } from "@/components/marketing/previews";
import { stringifyList, type MarketingStudioDraft, type StudioMediaState } from "./types";
import { hasPlayablePublicAsset } from "./mediaStatus";

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
  if (mediaState.status === "queued") return "Video queued";
  if (mediaState.status === "preparing") return "Preparing";
  if (mediaState.status === "routing") return "Routing";
  if (mediaState.status === "generating") return "Generating video";
  if (mediaState.status === "rendering") return "Rendering";
  if (mediaState.status === "processing") return "Processing";
  if (mediaState.status === "retrying") return "Retrying";
  if (mediaState.status === "completed") return "Video ready";
  if (mediaState.status === "setup_needed") return "Video model missing";
  if (mediaState.status === "scene_plan_required") return "Scene plan required";
  if (mediaState.status === "cancelled") return "Cancelled";
  return "Video failed";
}

export function PreviewCanvas({
  draft,
  mediaState,
  onRetryGenX,
  onCreateBranded,
  onAddVoiceover,
  onAddMusic,
  onGenerateLongerScenePlan,
  onRegenerateBetter,
  onDownload,
  onArchive,
}: {
  draft: MarketingStudioDraft | null;
  mediaState?: StudioMediaState;
  onRetryGenX?: () => void;
  onCreateBranded?: () => void;
  onAddVoiceover?: () => void;
  onAddMusic?: () => void;
  onGenerateLongerScenePlan?: () => void;
  onRegenerateBetter?: () => void;
  onDownload?: () => void;
  onArchive?: () => void;
}) {
  const state = mediaState ?? { status: "idle" };
  const kind = resolveKind(draft?.platform);
  const mediaUrl = state.publicUrl ?? null;
  const mime = state.mimeType ?? "";
  const playable = hasPlayablePublicAsset({ publicUrl: mediaUrl, mimeType: mime });
  const effectiveStatus = playable ? "completed" : state.status;
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
            effectiveStatus === "completed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : effectiveStatus === "failed" || effectiveStatus === "setup_needed"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-stone-200 bg-stone-50 text-stone-600"
          }`}>{mediaLabel({ ...state, status: effectiveStatus ?? "idle" } as StudioMediaState)}</Badge>
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
      ) : effectiveStatus && effectiveStatus !== "idle" ? (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          <p className="font-medium text-stone-800">{mediaLabel({ ...state, status: effectiveStatus } as StudioMediaState)}</p>
          {state.message ? <p className="mt-1 text-xs leading-5 text-stone-500">{state.message}</p> : null}
          {typeof state.progressPercent === "number" ? (
            <p className="mt-1 text-xs leading-5 text-stone-500">Progress: {state.progressPercent}%</p>
          ) : null}
          {typeof state.estimatedCompletionSeconds === "number" && state.estimatedCompletionSeconds > 0 ? (
            <p className="text-xs leading-5 text-stone-500">ETA: ~{state.estimatedCompletionSeconds}s</p>
          ) : null}
          {typeof state.queuePosition === "number" && state.queuePosition > 0 ? (
            <p className="text-xs leading-5 text-stone-500">Queue position: {state.queuePosition}</p>
          ) : null}
          {(effectiveStatus === "failed" || effectiveStatus === "setup_needed") && onRetryGenX ? (
            <Button type="button" size="sm" variant="outline" className="mt-3 rounded-xl border-stone-200" onClick={onRetryGenX}>
              Retry with GenX
            </Button>
          ) : null}
          {effectiveStatus === "completed" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {state.isSilent ? <Badge className="rounded-full border border-stone-200 bg-stone-100 text-stone-600">Silent video</Badge> : null}
              {onCreateBranded ? <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onCreateBranded}>Create branded version</Button> : null}
              {onAddVoiceover ? <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onAddVoiceover}>Add voiceover</Button> : null}
              {onAddMusic ? <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onAddMusic}>Add music</Button> : null}
              {onGenerateLongerScenePlan ? <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onGenerateLongerScenePlan}>Generate longer scene plan</Button> : null}
              {onRegenerateBetter ? <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onRegenerateBetter}>Regenerate better version</Button> : null}
              {onDownload ? <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onDownload}>Download</Button> : null}
              {onArchive ? <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onArchive}>Delete/archive</Button> : null}
            </div>
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
