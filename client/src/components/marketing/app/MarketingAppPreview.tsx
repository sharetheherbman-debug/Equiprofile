import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudioPreviewCard } from "@/components/marketing/previews";
import { stringifyList, type MarketingStudioDraft, type StudioMediaState } from "@/components/marketing/studio/types";
import { hasPlayablePublicAsset } from "@/components/marketing/studio/mediaStatus";
import type { StudioPreviewKind } from "@/components/marketing/previews";

function resolvePreviewKind(platform?: string): StudioPreviewKind {
  const v = (platform || "").toLowerCase();
  if (v.includes("instagram")) return "Instagram";
  if (v.includes("tiktok")) return "TikTok";
  if (v.includes("long")) return "YouTube Long-form";
  if (v.includes("short")) return "YouTube Shorts";
  if (v.includes("youtube")) return "YouTube";
  if (v.includes("linkedin")) return "LinkedIn";
  if (v.includes("google")) return "Google Business";
  if (v.includes("email")) return "Email";
  if (v.includes("blog")) return "Blog";
  return "Facebook";
}

function mediaStatusLabel(state: StudioMediaState): string {
  if (state.status === "idle") return "Script ready";
  if (state.status === "queued") return "Video queued";
  if (state.status === "preparing") return "Preparing";
  if (state.status === "routing") return "Routing";
  if (state.status === "generating") return "Generating video";
  if (state.status === "rendering") return "Rendering";
  if (state.status === "processing") return "Processing";
  if (state.status === "retrying") return "Retrying";
  if (state.status === "completed") return "Video ready";
  if (state.status === "setup_needed") return "Video model missing";
  if (state.status === "scene_plan_required") return "Scene plan required";
  if (state.status === "cancelled") return "Cancelled";
  return "Video failed";
}

export function MarketingAppPreview({
  draft,
  mediaState,
  selectedAssetLabel,
  relevancePassed,
  relevanceReason,
  approved,
  onRetryGenX,
  onRetryPreview,
  onApprove,
  onReject,
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
  selectedAssetLabel?: string;
  relevancePassed?: boolean;
  relevanceReason?: string;
  approved?: boolean;
  onRetryGenX?: () => void;
  onRetryPreview?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onCreateBranded?: () => void;
  onAddVoiceover?: () => void;
  onAddMusic?: () => void;
  onGenerateLongerScenePlan?: () => void;
  onRegenerateBetter?: () => void;
  onDownload?: () => void;
  onArchive?: () => void;
}) {
  const state = mediaState ?? { status: "idle" as const };
  const kind = resolvePreviewKind(draft?.platform);
  const publicUrl = state.publicUrl ?? null;
  const mime = state.mimeType ?? "";
  const assetId = state.assetId;
  const playable = hasPlayablePublicAsset({ publicUrl, mimeType: mime });
  const effectiveStatus = playable ? "completed" : state.status;

  // Empty state — nothing selected or generated yet
  if (!draft && state.status === "idle") {
    return (
      <aside
        className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 bg-white p-8 text-center"
        aria-label="Preview panel"
      >
        <div className="mb-4 size-12 rounded-2xl bg-gradient-to-br from-violet-100 to-stone-100 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
        <p className="font-medium text-stone-700">Preview panel</p>
        <p className="mt-1 max-w-xs text-sm text-stone-400">
          Your preview will appear here once The Marketing App creates or selects something.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm" aria-label="Preview panel">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-stone-800">Preview</p>
          <p className="text-xs text-stone-400">{selectedAssetLabel ? `Showing: ${selectedAssetLabel}` : "Live output preview"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">{kind}</Badge>
          <Badge
            className={`rounded-full border px-3 py-1 text-xs ${
              effectiveStatus === "completed"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : effectiveStatus === "failed" || effectiveStatus === "setup_needed"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-stone-200 bg-stone-50 text-stone-600"
            }`}
          >
            {mediaStatusLabel({ ...state, status: effectiveStatus as StudioMediaState["status"] })}
          </Badge>
        </div>
      </div>

      {/* Media area */}
      {publicUrl ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-950">
          {mime.startsWith("video/") ? (
            <video
              src={publicUrl}
              controls
              autoPlay
              muted
              loop
              className="aspect-video w-full object-cover"
              aria-label="Generated video preview"
            />
          ) : mime.startsWith("image/") ? (
            <img src={publicUrl} alt="Generated media preview" className="aspect-video w-full object-cover" />
          ) : mime.startsWith("audio/") ? (
            <div className="p-4">
              <audio src={publicUrl} controls className="w-full" aria-label="Generated voice preview" />
            </div>
          ) : null}
        </div>
      ) : effectiveStatus !== "idle" ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          <p className="font-medium text-stone-800">
            {mediaStatusLabel({ ...state, status: effectiveStatus as StudioMediaState["status"] })}
          </p>
          {state.message ? <p className="mt-1 text-xs leading-5 text-stone-500">{state.message}</p> : null}
          {typeof state.progressPercent === "number" ? (
            <p className="mt-1 text-xs text-stone-500">Progress: {state.progressPercent}%</p>
          ) : null}
          {typeof state.estimatedCompletionSeconds === "number" && state.estimatedCompletionSeconds > 0 ? (
            <p className="text-xs text-stone-500">ETA: ~{state.estimatedCompletionSeconds}s</p>
          ) : null}
          {typeof state.queuePosition === "number" && state.queuePosition > 0 ? (
            <p className="text-xs text-stone-500">Queue: position {state.queuePosition}</p>
          ) : null}
          {/* Error state: show assetId and publicUrl for debugging */}
          {effectiveStatus === "failed" ? (
            <div className="mt-2 rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-500">
              {assetId ? <p>Asset ID: {String(assetId)}</p> : null}
              {state.publicUrl ? <p>URL: {state.publicUrl}</p> : <p>No publicUrl available</p>}
              {onRetryPreview ? (
                <Button type="button" size="sm" variant="outline" className="mt-2 rounded-xl border-stone-200 text-xs" onClick={onRetryPreview}>
                  Retry Preview
                </Button>
              ) : null}
            </div>
          ) : null}
          {(effectiveStatus === "failed" || effectiveStatus === "setup_needed") && onRetryGenX ? (
            <Button type="button" size="sm" variant="outline" className="mt-3 rounded-xl border-stone-200" onClick={onRetryGenX}>
              Retry with GenX
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Completed actions */}
      {effectiveStatus === "completed" ? (
        <div className="flex flex-wrap gap-2">
          {relevancePassed === false ? (
            <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-700">QA: relevance check failed</Badge>
          ) : (
            <Badge className={`rounded-full border ${approved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-600"}`}>
              {approved ? "Approved" : "Pending approval"}
            </Badge>
          )}
          {state.isSilent ? (
            <Badge className="rounded-full border border-stone-200 bg-stone-100 text-stone-600">Silent video</Badge>
          ) : null}
          {onApprove ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl border-emerald-200 text-emerald-700"
              disabled={relevancePassed === false || approved}
              onClick={onApprove}
            >
              Approve
            </Button>
          ) : null}
          {onReject ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-red-200 text-red-600" onClick={onReject}>
              Reject
            </Button>
          ) : null}
          {onCreateBranded ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onCreateBranded}>
              Create branded version
            </Button>
          ) : null}
          {onAddVoiceover ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onAddVoiceover}>
              Add voiceover
            </Button>
          ) : null}
          {onAddMusic ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onAddMusic}>
              Add music
            </Button>
          ) : null}
          {onGenerateLongerScenePlan ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onGenerateLongerScenePlan}>
              Generate longer scene plan
            </Button>
          ) : null}
          {onRegenerateBetter ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onRegenerateBetter}>
              Regenerate
            </Button>
          ) : null}
          {onDownload ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onDownload}>
              Download
            </Button>
          ) : null}
          {onArchive ? (
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200" onClick={onArchive}>
              Delete
            </Button>
          ) : null}
          {relevancePassed === false && relevanceReason ? (
            <p className="w-full text-xs text-amber-700">{relevanceReason}</p>
          ) : null}
        </div>
      ) : null}

      {/* Platform preview card */}
      <StudioPreviewCard
        payload={{
          kind,
          title: draft?.title || "Create a campaign to preview it here",
          caption:
            draft?.caption ||
            draft?.script ||
            draft?.strategy ||
            "Your generated caption, script and CTA will update this preview immediately.",
          script: draft?.script,
          cta: draft?.cta,
          hashtags: stringifyList(draft?.hashtags),
          scheduleRecommendation: draft?.recommendedSchedule,
        }}
      />
    </aside>
  );
}
