import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function ExportStep({
  plan,
  onExport,
}: {
  plan: Pick<MarketingStudioPlan, "status" | "contentType">;
  onExport: () => void;
}) {
  return (
    <div className="space-y-4" data-testid="export-step">
      <h3 className="font-semibold text-stone-800">Export / Schedule</h3>
      <p className="text-sm text-stone-500">
        Download your approved assets or add them to the content calendar for scheduling.
        Direct social posting will be available once real connectors are wired.
      </p>
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
