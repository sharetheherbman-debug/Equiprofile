import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function BriefStep({
  plan,
  onChange,
}: {
  plan: Pick<MarketingStudioPlan, "brief" | "goal" | "audience" | "platform">;
  onChange: (patch: Partial<Pick<MarketingStudioPlan, "brief" | "goal" | "audience" | "platform">>) => void;
}) {
  return (
    <div className="space-y-4" data-testid="brief-step">
      <h3 className="font-semibold text-stone-800">Brief</h3>
      <p className="text-sm text-stone-500">Describe what you want to achieve, who the audience is, and what platform this is for.</p>
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Goal</span>
          <input
            type="text"
            value={plan.goal}
            onChange={(event) => onChange({ goal: event.target.value })}
            placeholder="e.g. Drive signups from stable owners"
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Audience</span>
          <input
            type="text"
            value={plan.audience}
            onChange={(event) => onChange({ audience: event.target.value })}
            placeholder="e.g. Horse owners and stable managers"
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Brief (optional detail)</span>
          <textarea
            value={plan.brief}
            onChange={(event) => onChange({ brief: event.target.value })}
            placeholder="Add context, tone, key messages, or anything the AI should know"
            rows={3}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
        </label>
      </div>
    </div>
  );
}
