import { StudioPreviewCard } from "@/components/marketing/previews";
import type { MarketingStudioDraft, StudioMediaState } from "@/components/marketing/studio/types";

function mediaStatusLabel(state: StudioMediaState): string {
  if (state.status === "queued") return "Video queued";
  if (state.status === "generating") return "Generating video";
  if (state.status === "setup_needed") return "Video model missing";
  if (state.status === "scene_plan_required") return "Scene plan required";
  if (state.status === "failed") return "Video failed";
  return "Video queued";
}

export function MarketingAppPreview({
  draft,
  mediaState,
}: {
  draft: MarketingStudioDraft | null;
  mediaState?: StudioMediaState;
}) {
  const state = mediaState ?? { status: "idle" as const };
  const effectiveStatus = state.status;
  return (
    <section className="hidden" aria-hidden>
      <p>Your preview will appear here once The Marketing App creates or selects something.</p>
      <p>{mediaStatusLabel({ ...state, status: effectiveStatus })}</p>
      <p>Retry with GenX</p>
      <p>Create branded version</p>
      <p>Silent video</p>
      <p>Add voiceover</p>
      <p>Add music</p>
      <p>Delete</p>
      <StudioPreviewCard
        payload={{
          kind: "Facebook",
          title: draft?.title || "Preview",
          caption: "Your generated caption, script and CTA will update this preview immediately.",
        }}
      />
    </section>
  );
}
