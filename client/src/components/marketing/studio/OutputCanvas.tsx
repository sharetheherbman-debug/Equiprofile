import { Badge } from "@/components/ui/badge";
import { draftHasContent, normalizeDraftFromText, stringifyList, textFromUnknown, type MarketingStudioDraft } from "./types";

function Section({ title, children }: { title: string; children?: string }) {
  if (!children?.trim()) return null;
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase text-emerald-200">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">{children}</p>
    </div>
  );
}

export function OutputCanvas({ command, draft }: { command: string; draft: MarketingStudioDraft | null }) {
  const needsPlainTextFallback = !!draft?.plainText && !draft.title && !draft.script && !draft.caption && !draft.strategy;
  const visibleDraft = needsPlainTextFallback ? normalizeDraftFromText(command, draft.plainText || "") : draft;
  const shotList = textFromUnknown(visibleDraft?.shotList || visibleDraft?.storyboard);
  const nextActions = stringifyList(visibleDraft?.nextActions);
  const hashtags = stringifyList(visibleDraft?.hashtags);
  const score = typeof visibleDraft?.growthScore?.overallScore === "number" ? visibleDraft.growthScore.overallScore : null;

  if (!draftHasContent(visibleDraft ?? null)) {
    return (
      <section className="min-h-[32rem] rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-white shadow-2xl" aria-label="Output Canvas">
        <div className="flex h-full min-h-96 flex-col items-center justify-center text-center">
          <Badge className="mb-4 border-white/10 bg-white/10 text-white">Output Canvas</Badge>
          <h2 className="text-2xl font-semibold">Your campaign result will appear here.</h2>
          <p className="mt-3 max-w-lg text-sm text-slate-300">Type a command, pick a quick create tile, or launch Autopilot. The Studio will organize strategy, copy, creative direction, compliance and schedule in one readable result.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 text-white shadow-2xl md:p-6" aria-label="Output Canvas">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge className="mb-3 border-emerald-300/30 bg-emerald-300/15 text-emerald-100">Generated campaign</Badge>
          <h2 className="text-2xl font-semibold">{visibleDraft?.title || "Campaign draft"}</h2>
          <p className="mt-2 text-sm text-slate-300">{visibleDraft?.platform || "Selected platform"} {visibleDraft?.format ? `- ${visibleDraft.format}` : ""}</p>
        </div>
        {score !== null ? <Badge className="rounded-full bg-emerald-300 px-3 py-2 text-slate-950">Growth score {score}/100</Badge> : null}
      </div>
      <div className="grid gap-3">
        <Section title="Strategy">{visibleDraft?.strategy}</Section>
        <Section title="Hook">{visibleDraft?.hook}</Section>
        <Section title="Script / body">{visibleDraft?.script || visibleDraft?.body}</Section>
        <Section title="Shot list / storyboard">{shotList}</Section>
        <Section title="Caption">{visibleDraft?.caption}</Section>
        <Section title="CTA">{visibleDraft?.cta}</Section>
        {hashtags.length ? (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-200">Hashtags</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hashtags.slice(0, 16).map((tag) => (
                <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">{tag.startsWith("#") ? tag : `#${tag}`}</span>
              ))}
            </div>
          </div>
        ) : null}
        <Section title="Visual direction">{visibleDraft?.visualDirection}</Section>
        <Section title="Voiceover">{visibleDraft?.voiceoverScript}</Section>
        <Section title="Media plan">{visibleDraft?.mediaPlan || visibleDraft?.mediaStatus}</Section>
        <Section title="Schedule recommendation">{visibleDraft?.recommendedSchedule}</Section>
        <Section title="Compliance result">{visibleDraft?.complianceNotes}</Section>
        {nextActions.length ? (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-200">Next actions</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-100">
              {nextActions.slice(0, 6).map((action) => <li key={action}>- {action}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
