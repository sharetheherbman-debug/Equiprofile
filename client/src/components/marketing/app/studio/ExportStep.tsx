import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

type VisualQaStatus = "pending" | "needs_review" | "passed" | "failed" | "blocked" | "setup_needed";

const VISUAL_QA_STATUS_LABELS: Record<VisualQaStatus, string> = {
  pending: "Visual QA Pending",
  needs_review: "Visual QA Needs Review",
  passed: "Visual QA Passed",
  failed: "Visual QA Failed",
  blocked: "Visual QA Blocked",
  setup_needed: "Visual QA — Setup Needed",
};

const VISUAL_QA_STATUS_COLORS: Record<VisualQaStatus, string> = {
  pending: "text-stone-600 bg-stone-50 border-stone-200",
  needs_review: "text-amber-700 bg-amber-50 border-amber-200",
  passed: "text-emerald-700 bg-emerald-50 border-emerald-200",
  failed: "text-red-700 bg-red-50 border-red-200",
  blocked: "text-red-700 bg-red-50 border-red-200",
  setup_needed: "text-stone-500 bg-stone-50 border-stone-200",
};

export function ExportStep({
  plan,
  onExport,
  renderJob,
  onRunQa,
  onApprove,
  onReject,
  onRequestChanges,
  onMarkExported,
  visualQaRecord,
  onRunVisualQa,
  onMarkVisualQaPassed,
  onMarkVisualQaFailed,
  onRequestVisualQaChanges,
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
  visualQaRecord?: {
    status: VisualQaStatus;
    thumbnailUrl?: string | null;
    frameUrls?: string[];
    reviewNotes?: string | null;
    issues?: { code: string; message: string; severity: string }[];
  } | null;
  onRunVisualQa?: () => void;
  onMarkVisualQaPassed?: () => void;
  onMarkVisualQaFailed?: (reason: string) => void;
  onRequestVisualQaChanges?: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  const [visualQaReason, setVisualQaReason] = React.useState("");
  const renderCompleted = renderJob?.status === "completed" && Boolean(renderJob.outputPublicUrl);
  const reviewStatus = renderJob?.reviewStatus ?? "needs_review";
  const canMarkExported = reviewStatus === "approved" && Boolean(onMarkExported);
  const alreadyExported = reviewStatus === "exported";
  const visualQaStatus = visualQaRecord?.status ?? null;

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

          {/* Visual QA section */}
          <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3 space-y-2" data-testid="visual-qa-section">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-stone-700">Visual QA</span>
              {visualQaStatus ? (
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${VISUAL_QA_STATUS_COLORS[visualQaStatus]}`}>
                  {VISUAL_QA_STATUS_LABELS[visualQaStatus]}
                </span>
              ) : (
                <span className="rounded-full border border-stone-200 px-2 py-0.5 text-xs text-stone-400">Not run</span>
              )}
              {onRunVisualQa ? (
                <button type="button" className="rounded-full border border-stone-300 px-3 py-0.5 text-xs text-stone-700 hover:bg-stone-100" onClick={onRunVisualQa} data-testid="run-visual-qa-btn">
                  Run visual QA
                </button>
              ) : null}
            </div>
            {visualQaRecord?.thumbnailUrl ? (
              <img src={visualQaRecord.thumbnailUrl} alt="Video thumbnail" className="rounded-lg border border-stone-200 max-h-32 object-cover" data-testid="visual-qa-thumbnail" />
            ) : null}
            {visualQaRecord?.frameUrls?.length ? (
              <div className="flex gap-2 flex-wrap" data-testid="visual-qa-frames">
                {visualQaRecord.frameUrls.slice(0, 5).map((url, index) => (
                  <img key={`${url}-${index}`} src={url} alt={`Frame ${index + 1}`} className="rounded border border-stone-200 max-h-20 object-cover" />
                ))}
              </div>
            ) : null}
            {visualQaRecord?.issues?.length ? (
              <ul className="text-xs text-red-600 space-y-0.5">
                {visualQaRecord.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>• [{issue.severity}] {issue.message}</li>)}
              </ul>
            ) : null}
            {visualQaRecord?.reviewNotes ? (
              <p className="text-xs text-stone-500 italic">{visualQaRecord.reviewNotes}</p>
            ) : null}
            {(onMarkVisualQaPassed || onMarkVisualQaFailed || onRequestVisualQaChanges) && visualQaStatus ? (
              <div className="space-y-2 pt-1">
                <input
                  className="w-full rounded border border-stone-200 px-3 py-1.5 text-xs"
                  value={visualQaReason}
                  onChange={(e) => setVisualQaReason(e.target.value)}
                  placeholder="Reason / notes for visual QA action"
                />
                <div className="flex flex-wrap gap-2">
                  {onMarkVisualQaPassed ? (
                    <button type="button" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100" onClick={onMarkVisualQaPassed}>
                      Mark visual QA passed
                    </button>
                  ) : null}
                  {onMarkVisualQaFailed ? (
                    <button type="button" className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100" onClick={() => visualQaReason.trim() && onMarkVisualQaFailed(visualQaReason)} disabled={!visualQaReason.trim()}>
                      Mark visual QA failed
                    </button>
                  ) : null}
                  {onRequestVisualQaChanges ? (
                    <button type="button" className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700 hover:bg-amber-100" onClick={() => visualQaReason.trim() && onRequestVisualQaChanges(visualQaReason)} disabled={!visualQaReason.trim()}>
                      Request visual QA changes
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex gap-3 flex-wrap">
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

