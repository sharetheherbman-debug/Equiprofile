import React from "react";
import type { MarketingStudioPlan, MarketingStudioScene } from "@shared/_core/marketingStudioPlan";

export function ScenePlanStep({
  plan,
  onUpdateScene,
}: {
  plan: Pick<MarketingStudioPlan, "scenes">;
  onUpdateScene: (sceneId: string, patch: Partial<MarketingStudioScene>) => void;
}) {
  return (
    <div className="space-y-4" data-testid="scene-plan-step">
      <h3 className="font-semibold text-stone-800">Scene Plan</h3>
      <p className="text-sm text-stone-500">
        Each scene becomes a clip in the assembled video. Review and adjust the order, duration, and visual direction.
      </p>
      {plan.scenes.length === 0 ? (
        <p className="text-sm text-stone-400">No scenes yet. Generate a script first to auto-create scenes.</p>
      ) : (
        <ol className="space-y-3">
          {plan.scenes.map((scene, index) => (
            <li key={scene.id} className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-stone-400">Scene {index + 1}</span>
                <span className="text-xs text-stone-500">{scene.durationSeconds}s</span>
              </div>
              <p className="text-sm text-stone-700">{scene.narration || "No narration"}</p>
              <p className="text-xs text-stone-500 italic">{scene.visualPrompt || "No visual direction"}</p>
              <div className="flex gap-2">
                <label className="text-xs text-stone-500">Source:</label>
                <select
                  value={scene.sourceType}
                  onChange={(event) =>
                    onUpdateScene(scene.id, {
                      sourceType: event.target.value as MarketingStudioScene["sourceType"],
                    })
                  }
                  className="rounded border border-stone-200 px-1 py-0.5 text-xs"
                >
                  <option value="stock">Stock media</option>
                  <option value="generated">AI-generated</option>
                  <option value="upload">Upload</option>
                  <option value="text_card">Text card</option>
                </select>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
