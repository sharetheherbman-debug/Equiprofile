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
    <aside className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-4 text-white shadow-2xl backdrop-blur" aria-label="Preview Canvas">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Preview Canvas</p>
          <p className="text-xs text-slate-300">Large readable platform preview</p>
        </div>
        <Badge className="border-white/10 bg-white/10 text-white">{kind}</Badge>
      </div>
      <div className="[&_*]:text-current [&_.text-muted-foreground]:text-slate-300 [&_.bg-white]:bg-slate-950 [&_.border]:border-white/10">
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
      </div>
    </aside>
  );
}
