import { BadgeCheck, Clock, Image, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatformPreview, type MarketingPreviewDraft } from "@/components/marketing/PlatformPreview";

type ActionDraft = MarketingPreviewDraft & {
  id?: string;
  growthScore?: { overallScore?: number; reasons?: string[] } & Record<string, unknown>;
};

export function MarketingActionRail({
  draft,
  draftMode,
  mediaReady,
  mediaLabel,
  approvalsCount,
  scheduleAt,
  setScheduleAt,
  onEdit,
  onRegenerate,
  onGenerateImage,
  onGenerateVideo,
  onGenerateVoice,
  onGenerateAvatar,
  onApprove,
  onSchedule,
}: {
  draft: ActionDraft | null;
  draftMode: boolean;
  mediaReady: boolean;
  mediaLabel?: string;
  approvalsCount: number;
  scheduleAt: string;
  setScheduleAt: (value: string) => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onGenerateImage: () => void;
  onGenerateVideo: () => void;
  onGenerateVoice: () => void;
  onGenerateAvatar: () => void;
  onApprove: () => void;
  onSchedule: () => void;
}) {
  return (
    <aside className="border-t border-white/10 bg-slate-900/70 p-5 xl:border-l xl:border-t-0">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Preview + Actions</p>
        <h2 className="mt-2 text-2xl font-semibold">Live campaign output</h2>
      </div>
      <div className="rounded-[24px] bg-white p-4 text-slate-950 shadow-xl">
        <PlatformPreview draft={draft} draftMode={draftMode} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Growth score</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-4xl font-bold">{draft?.growthScore?.overallScore ?? "-"}</p>
            <p className="pb-1 text-sm text-slate-400">/100</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compliance</p>
          <p className="mt-3 text-sm text-slate-200">{draft ? "Review ready" : "Waiting"}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
        <p className="text-sm font-semibold">Actions</p>
        <div className="mt-3 grid gap-2">
          <Button variant="secondary" disabled={!draft} onClick={onEdit}>Edit</Button>
          <Button variant="secondary" disabled={!draft} onClick={onRegenerate}>Regenerate</Button>
          <Button variant="secondary" disabled={!draft || !mediaReady} onClick={onGenerateImage}>Generate image</Button>
          <Button variant="secondary" disabled={!draft || !mediaReady} onClick={onGenerateVideo}>Generate video</Button>
          <Button variant="secondary" disabled={!draft || !mediaReady} onClick={onGenerateVoice}>Generate voice</Button>
          <Button variant="secondary" disabled={!draft || !mediaReady} onClick={onGenerateAvatar}>Generate avatar</Button>
          <Button disabled={!draft} onClick={onApprove}><Send className="mr-2 h-4 w-4" />Approve</Button>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className="bg-white text-slate-950" />
            <Button variant="secondary" disabled={!draft || !scheduleAt} onClick={onSchedule}>Schedule</Button>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-400" /> Review compliance notes before scheduling</div>
          <div className="flex items-center gap-2"><Image className="h-4 w-4 text-slate-300" /> {mediaLabel || "Media status will appear here"}</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-300" /> {approvalsCount} items waiting</div>
        </div>
      </div>
    </aside>
  );
}
