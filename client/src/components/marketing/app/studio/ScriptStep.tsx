import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function ScriptStep({
  plan,
  isGenerating,
  onChange,
  onGenerate,
}: {
  plan: Pick<MarketingStudioPlan, "script">;
  isGenerating?: boolean;
  onChange: (patch: Pick<MarketingStudioPlan, "script">) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4" data-testid="script-step">
      <h3 className="font-semibold text-stone-800">Script / Copy</h3>
      <p className="text-sm text-stone-500">
        AI will generate a script from your brief. You can edit it before continuing.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {isGenerating ? "Generating…" : "Generate script"}
      </button>
      {plan.script ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Script</span>
          <textarea
            value={plan.script}
            onChange={(event) => onChange({ script: event.target.value })}
            rows={8}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </label>
      ) : null}
    </div>
  );
}
