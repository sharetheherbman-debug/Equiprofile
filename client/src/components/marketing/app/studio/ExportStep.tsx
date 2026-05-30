import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function ExportStep({
  plan,
  onExport,
  renderJob,
  onRunQa,
  onApprove,
  onReject,
  onRequestChanges,
  onMarkExported,
}: {
  plan: Pick<MarketingStudioPlan, "status" | "contentType">;
  onExport: () => void;
  renderJob?: {
    status?: string;
    outputPublicUrl?: string | null;
    brandKitId?: number | null;
    overlayTemplate?: string | null;
    brandOverlay?: { brandName?: string; domain?: string; cta?: string } | null;
    audio?: { status?: string | null } | null;
    captions?: { status?: string | null } | null;
    warnings?: string[] | null;
    reviewStatus?: string | null;
  } | null;
  onRunQa?: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onRequestChanges?: (reason: string) => void;
  onMarkExported?: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const renderCompleted = renderJob?.status === "completed" && Boolean(renderJob.outputPublicUrl);
  const reviewStatus = renderJob?.reviewStatus ?? "needs_review";
  const canMarkExported = reviewStatus === "approved" && Boolean(onMarkExported);
  const alreadyExported = reviewStatus === "exported";

  return (
    <div className="space-y-4" data-testid="export-step">
      <h3 className="font-semibold text-stone-800">Export / Schedule</h3>
      <p className="text-sm text-stone-500">
        Download your approved assets or add them to the content calendar for scheduling.
        Direct social posting will be available once real connectors are wired.
      </p>
      {renderCompleted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <p><strong>Review status:</strong> {reviewStatus}</p>
          {reviewStatus !== "approved" ? (
            <p className="mt-1 text-xs text-amber-700">Needs review before it is considered export-ready.</p>
          ) : null}
          <p><strong>Asset saved.</strong> Rendered MP4 is ready.</p>
          <p className="mt-1 text-xs">
            {renderJob?.audio?.status === "completed" ? "voiceover included" : "silent captioned"} · {renderJob?.captions?.status === "burned_in" ? "captions burned in" : "captions file available"}
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Brand kit: {renderJob?.brandOverlay?.brandName ?? "Unknown"} · {renderJob?.brandOverlay?.domain ?? "Unknown domain"} · CTA: {renderJob?.brandOverlay?.cta ?? "N/A"} · Template: {renderJob?.overlayTemplate ?? "lower_third"}
          </p>
          <div className="mt-2 flex gap-3 flex-wrap">
            <a
              href={renderJob?.outputPublicUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700"
            >
              Open video
            </a>
            <a
              href={renderJob?.outputPublicUrl ?? "#"}
              download
              className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Download video
            </a>
          </div>
          {renderJob?.warnings?.length ? (
            <ul className="mt-2 space-y-1 text-xs text-amber-700">
              {renderJob.warnings.map((warning, index) => <li key={`${warning}-${index}`}>• {warning}</li>)}
            </ul>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {onRunQa ? <button type="button" className="rounded-full border border-stone-200 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50" onClick={onRunQa}>Run QA</button> : null}
            {onApprove ? <button type="button" className="rounded-full border border-stone-200 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50" onClick={onApprove}>Approve</button> : null}
            {canMarkExported ? <button type="button" className="rounded-full border border-stone-200 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50" onClick={onMarkExported}>Mark exported</button> : null}
            {alreadyExported ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">Marked exported</span> : null}
          </div>
          {onReject || onRequestChanges ? (
            <div className="mt-2 space-y-2">
              <input
                className="w-full rounded border border-stone-200 px-3 py-2 text-xs"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for reject/request changes"
              />
              <div className="flex flex-wrap gap-2">
                {onReject ? <button type="button" className="rounded-full border border-stone-200 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50" onClick={() => reason.trim() && onReject(reason)}>Reject</button> : null}
                {onRequestChanges ? <button type="button" className="rounded-full border border-stone-200 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50" onClick={() => reason.trim() && onRequestChanges(reason)}>Request changes</button> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Render job is not complete yet. Finish Render step to unlock MP4 export.
        </p>
      )}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={onExport}
          className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700"
        >
          Export manually
        </button>
        <span className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-400">
          Social posting — Needs setup
        </span>
      </div>
    </div>
  );
}
