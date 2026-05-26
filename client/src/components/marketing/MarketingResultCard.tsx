import { Badge } from "@/components/ui/badge";

export type MarketingResultDraft = {
  title?: string;
  strategy?: string;
  hook?: string;
  script?: string;
  shotList?: unknown;
  storyboard?: unknown;
  caption?: string;
  cta?: string;
  hashtags?: unknown;
  visualDirection?: string;
  voiceoverScript?: string;
  recommendedSchedule?: string;
  complianceNotes?: string;
  mediaPlan?: string;
  nextActions?: unknown;
};

function stringifyList(value: unknown): string {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "string") return value;
  if (!value) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function MarketingResultCard({ draft }: { draft: MarketingResultDraft | null }) {
  const sections = draft ? [
    ["Strategy", draft.strategy || draft.title],
    ["Hook", draft.hook],
    ["30-second script", draft.script],
    ["Storyboard / shot list", stringifyList(draft.storyboard || draft.shotList)],
    ["Caption", draft.caption],
    ["CTA", draft.cta],
    ["Hashtags", stringifyList(draft.hashtags)],
    ["Visual direction", draft.visualDirection],
    ["Voiceover script", draft.voiceoverScript],
    ["Recommended posting time", draft.recommendedSchedule],
    ["Compliance notes", draft.complianceNotes],
    ["Media plan", draft.mediaPlan],
    ["Next actions", stringifyList(draft.nextActions)],
  ] : [];

  return (
    <div className="min-h-[320px] rounded-[24px] border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Generated Result</p>
          <h3 className="mt-2 text-xl font-semibold">Campaign output</h3>
        </div>
        {draft ? <Badge>Ready for review</Badge> : <Badge variant="outline">Waiting</Badge>}
      </div>
      {!draft ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
          <p className="font-semibold">Ready for your first command</p>
          <p className="mt-2 text-sm text-slate-400">Try: Create a 30-second Facebook reel for UK stable owners.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{String(value || "Not generated yet.")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
