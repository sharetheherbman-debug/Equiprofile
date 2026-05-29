import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function ExportStep({
  plan,
  onExport,
  renderJob,
}: {
  plan: Pick<MarketingStudioPlan, "status" | "contentType">;
  onExport: () => void;
  renderJob?: {
    status?: string;
    outputPublicUrl?: string | null;
  } | null;
}) {
  const renderCompleted = renderJob?.status === "completed" && Boolean(renderJob.outputPublicUrl);

  return (
    <div className="space-y-4" data-testid="export-step">
      <h3 className="font-semibold text-stone-800">Export / Schedule</h3>
      <p className="text-sm text-stone-500">
        Download your approved assets or add them to the content calendar for scheduling.
        Direct social posting will be available once real connectors are wired.
      </p>
      {renderCompleted ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <p><strong>Asset saved.</strong> Rendered MP4 is ready.</p>
          <div className="mt-2 flex gap-3 flex-wrap">
            <a
              href={renderJob?.outputPublicUrl ?? \"#\"}
              target=\"_blank\"
              rel=\"noreferrer\"
              className=\"rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700\"
            >
              Open video
            </a>
            <a
              href={renderJob?.outputPublicUrl ?? \"#\"}
              download
              className=\"rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50\"
            >
              Download video
            </a>
          </div>
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
