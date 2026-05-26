import { Badge } from "@/components/ui/badge";
import { StudioPreviewCard, type StudioPreviewKind } from "@/components/marketing/previews";
import { stringifyList, type MarketingStudioDraft } from "./types";

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

export function PreviewCanvas({ draft }: { draft: MarketingStudioDraft | null }) {
  const kind = resolveKind(draft?.platform);
  return (
    <aside className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm" aria-label="Preview Canvas">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Preview</p>
          <p className="text-xs text-stone-400">Platform content preview</p>
        </div>
        <Badge className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">{kind}</Badge>
      </div>
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
