import React from "react";
import type { MarketingStudioPlan } from "@shared/_core/marketingStudioPlan";

export function MediaSelectionStep({
  plan,
}: {
  plan: Pick<MarketingStudioPlan, "scenes">;
}) {
  return (
    <div className="space-y-4" data-testid="media-selection-step">
      <h3 className="font-semibold text-stone-800">Media Sources</h3>
      <p className="text-sm text-stone-500">
        Select or upload media for each scene. Stock media search (Pexels / Pixabay) will be available in PR42.
      </p>
      {plan.scenes.length === 0 ? (
        <p className="text-sm text-stone-400">No scenes to assign media to yet.</p>
      ) : (
        <ol className="space-y-3">
          {plan.scenes.map((scene, index) => (
            <li key={scene.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-mono text-stone-400 mb-1">Scene {index + 1} · {scene.sourceType}</p>
              {scene.assetId ? (
                <p className="text-sm text-green-700">Asset #{scene.assetId} selected</p>
              ) : (
                <p className="text-sm text-stone-400">No media selected — stock search available in next release.</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
