import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function RenderStep({
  plan,
  isAvailable = false,
  onStartRender,
}: {
  plan: Pick<MarketingStudioPlan, "status" | "renderMode">;
  isAvailable?: boolean;
  onStartRender: () => void;
}) {
  if (!isAvailable) {
    return (
      <div className="space-y-4" data-testid="render-step">
        <h3 className="font-semibold text-stone-800">Render</h3>
        <p className="text-sm text-stone-500">
          Scene assembly and rendering via Remotion + FFmpeg will be available in PR42 (Media Factory Core).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="render-step">
      <h3 className="font-semibold text-stone-800">Render</h3>
      <p className="text-sm text-stone-500">
        Assemble scenes into a final video. Render mode: <strong>{plan.renderMode}</strong>.
      </p>
      <button
        type="button"
        onClick={onStartRender}
        className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700"
      >
        Start render
      </button>
    </div>
  );
}
