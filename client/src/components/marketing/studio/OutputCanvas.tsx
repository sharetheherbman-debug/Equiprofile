import { useState } from "react";
import { ChevronDown, ChevronUp, Download, Edit2, CheckCircle2, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { draftHasContent, normalizeDraftFromText, stringifyList, textFromUnknown, type MarketingStudioDraft } from "./types";

/**
 * OutputCanvas — deliverable-first output.
 *
 * Default view: title, caption/summary, platform selector, approve/publish/download actions.
 * Details (script, hashtags, voiceover, compliance, growth score, etc.) are hidden
 * behind "View details" until the user requests them.
 */

const PLATFORM_OPTIONS = [
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube Shorts",
  "YouTube Long-form",
  "LinkedIn",
  "Google Business",
  "Email",
  "Blog",
];

function DetailSection({ title, children }: { title: string; children?: string }) {
  if (!children?.trim()) return null;
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">{title}</p>
      <p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{children}</p>
    </div>
  );
}

export function OutputCanvas({ command, draft }: { command: string; draft: MarketingStudioDraft | null }) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const needsPlainTextFallback = !!draft?.plainText && !draft.title && !draft.script && !draft.caption && !draft.strategy;
  const visibleDraft = needsPlainTextFallback ? normalizeDraftFromText(command, draft.plainText || "") : draft;
  const hashtags = stringifyList(visibleDraft?.hashtags);
  const shotList = textFromUnknown(visibleDraft?.shotList || visibleDraft?.storyboard);
  const nextActions = stringifyList(visibleDraft?.nextActions);

  if (!draftHasContent(visibleDraft ?? null)) {
    return (
      <section
        className="flex min-h-[28rem] flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm"
        aria-label="Output Canvas"
      >
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50">
          <Share2 className="size-7 text-violet-500" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">Your content will appear here</h2>
        <p className="mt-3 max-w-sm text-sm text-stone-400">
          Type a command above, pick a quick create tile, or launch Autopilot. Your AI team will build the finished deliverable.
        </p>
      </section>
    );
  }

  const title = visibleDraft?.title || "Content draft";
  const caption = visibleDraft?.caption || visibleDraft?.strategy || "";
  const platform = selectedPlatform ?? visibleDraft?.platform ?? "Social";

  return (
    <section className="rounded-3xl border border-stone-200 bg-white shadow-sm" aria-label="Output Canvas">
      {/* Primary deliverable — always visible */}
      <div className="p-5 md:p-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="mr-1 inline size-3" />
            Ready to review
          </Badge>
          {visibleDraft?.format ? (
            <Badge className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500">{visibleDraft.format}</Badge>
          ) : null}
        </div>

        <h2 className="mt-3 text-xl font-semibold text-stone-900 md:text-2xl">{title}</h2>

        {caption ? (
          <p className="mt-2 text-sm leading-6 text-stone-600">{caption}</p>
        ) : null}

        {/* Platform selector */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-stone-500">Select platform</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={platform === p}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${platform === p ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                onClick={() => setSelectedPlatform(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Primary action bar */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-xl bg-[#f97316] px-5 text-white hover:bg-[#ea6c0e] focus:outline-none focus:ring-2 focus:ring-orange-400"
            aria-label="Approve content"
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
            aria-label="Edit content"
          >
            <Edit2 className="mr-1.5 size-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
            aria-label="Download content"
          >
            <Download className="mr-1.5 size-4" />
            Download
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto rounded-xl text-stone-500 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            aria-controls="output-details"
          >
            {showDetails ? (
              <><ChevronUp className="mr-1 size-4" /> Hide details</>
            ) : (
              <><ChevronDown className="mr-1 size-4" /> View details</>
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible details — hidden by default */}
      {showDetails && (
        <div id="output-details" className="border-t border-stone-100 p-5 md:p-6">
          <div className="space-y-3">
            <DetailSection title="Strategy">{visibleDraft?.strategy}</DetailSection>
            <DetailSection title="Hook">{visibleDraft?.hook}</DetailSection>
            <DetailSection title="Script / body">{visibleDraft?.script || visibleDraft?.body}</DetailSection>
            <DetailSection title="Shot list / storyboard">{shotList}</DetailSection>
            <DetailSection title="CTA">{visibleDraft?.cta}</DetailSection>
            <DetailSection title="Media plan">{visibleDraft?.mediaPlan}</DetailSection>
            {hashtags.length ? (
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Hashtags</p>
                <div className="flex flex-wrap gap-2">
                  {hashtags.slice(0, 16).map((tag) => (
                    <span key={tag} className="rounded-full bg-stone-200 px-3 py-1 text-xs text-stone-700">
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <DetailSection title="Visual direction">{visibleDraft?.visualDirection}</DetailSection>
            <DetailSection title="Voiceover">{visibleDraft?.voiceoverScript}</DetailSection>
            <DetailSection title="Schedule recommendation">{visibleDraft?.recommendedSchedule}</DetailSection>
            <DetailSection title="Compliance">{visibleDraft?.complianceNotes}</DetailSection>
            {nextActions.length ? (
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Next actions</p>
                <ul className="space-y-1.5 text-sm text-stone-600">
                  {nextActions.slice(0, 6).map((action) => (
                    <li key={action} className="flex items-start gap-2">
                      <span className="mt-1 text-violet-400">›</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

